"""
BIS3 Defense - auth-passkey-register-verify Lambda

Verifies the registration attestation returned by the browser after the user
tapped their YubiKey or biometric authenticator. Stores the resulting
credential (public key + sign counter) in DynamoDB.

Flow:
  1. Browser called navigator.credentials.create() with options from
     /auth/passkey/register-options
  2. User tapped YubiKey or biometric
  3. Browser returns attestation - posted to this endpoint
  4. We look up the original challenge (by challengeId)
  5. py_webauthn verifies the attestation cryptographically
  6. We store credential_id + public_key + sign_count in DynamoDB
  7. User can now use this passkey for future authentications

Federal compliance:
    AC-3    Access Enforcement
    AU-2    Audit Events
    IA-2    Identification and Authentication
    IA-2(11) Hardware Authenticator
    IA-5    Authenticator Management
    SC-13   Cryptographic Protection (signature verification)
"""

import base64
import json
import logging
import os
import sys
import time

sys.path.insert(0, "/var/task")
sys.path.insert(0, "/opt/python")  # Lambda layer path

from cookies import parse_cookies, ID_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE
from jwt_verifier import verify_id_token, verify_access_token, JWTVerificationError
from responses import success, bad_request, unauthorized, internal_error

import boto3
from botocore.exceptions import ClientError

from webauthn import verify_registration_response
from webauthn.helpers.exceptions import InvalidRegistrationResponse
from webauthn.helpers.structs import RegistrationCredential


logger = logging.getLogger()
logger.setLevel(logging.INFO)


RP_ID = os.environ.get("WEBAUTHN_RP_ID", "staging.app.bis3ai.com")
EXPECTED_ORIGIN = os.environ.get(
    "WEBAUTHN_EXPECTED_ORIGIN",
    "https://staging.app.bis3ai.com",
)
PASSKEY_TABLE = os.environ.get("PASSKEY_TABLE", "bis3-defense-passkey-credentials")

dynamodb = boto3.resource("dynamodb")


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/passkey/register-verify

    Request body:
        {
            "challengeId": "...",  (from register-options response)
            "credential": {
                "id": "...",
                "rawId": "...",
                "response": {
                    "clientDataJSON": "...",
                    "attestationObject": "...",
                    "transports": [...]  (optional)
                },
                "type": "public-key",
                "clientExtensionResults": {...}
            },
            "friendlyName": "YubiKey 5C NFC"  (optional)
        }

    Response (success):
        {
            "status": "registered",
            "credential_id": "<base64url>",
            "friendly_name": "YubiKey 5C NFC"
        }

    Errors:
        400 INVALID_ATTESTATION  - signature verification failed
        400 EXPIRED_CHALLENGE    - challenge not found or expired
        401 UNAUTHENTICATED      - no valid session
    """
    request_id = context.aws_request_id if context else "no-context"

    # Step 1: User must be authenticated
    cookies = parse_cookies(event)
    id_token = cookies.get(ID_TOKEN_COOKIE)
    access_token = cookies.get(ACCESS_TOKEN_COOKIE)

    if not id_token and not access_token:
        return unauthorized("Authentication required")

    try:
        if id_token:
            claims = verify_id_token(id_token)
        else:
            claims = verify_access_token(access_token)
    except JWTVerificationError as e:
        return unauthorized("Session expired or invalid")

    user_sub = claims.get("sub")
    if not user_sub:
        return internal_error("Invalid session")

    # Step 2: Parse request body
    try:
        body_raw = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            body_raw = base64.b64decode(body_raw).decode("utf-8")
        body = json.loads(body_raw)
    except (json.JSONDecodeError, ValueError, UnicodeDecodeError):
        return bad_request("Invalid request body", error_code="MALFORMED_BODY")

    challenge_id = body.get("challengeId")
    credential_dict = body.get("credential")
    friendly_name = body.get("friendlyName") or "Passkey"

    if not challenge_id or not isinstance(challenge_id, str):
        return bad_request("challengeId is required", error_code="MISSING_CHALLENGE")
    if not credential_dict or not isinstance(credential_dict, dict):
        return bad_request("credential is required", error_code="MISSING_CREDENTIAL")
    if len(friendly_name) > 256:
        friendly_name = friendly_name[:256]

    # Step 3: Look up the challenge from DynamoDB
    table = dynamodb.Table(PASSKEY_TABLE)
    challenge_key = f"_challenge_{challenge_id}"

    try:
        chal_resp = table.get_item(Key={
            "user_sub": user_sub,
            "credential_id": challenge_key,
        })
        chal_item = chal_resp.get("Item")
    except ClientError:
        logger.exception("Failed to read challenge")
        return internal_error("Failed to read challenge")

    if not chal_item:
        return bad_request(
            "Challenge not found or already used",
            error_code="EXPIRED_CHALLENGE",
        )

    if chal_item.get("expires_at", 0) < int(time.time()):
        # Clean up expired challenge
        table.delete_item(Key={"user_sub": user_sub, "credential_id": challenge_key})
        return bad_request(
            "Challenge expired - please retry registration",
            error_code="EXPIRED_CHALLENGE",
        )

    if chal_item.get("purpose") != "registration":
        return bad_request("Challenge is not for registration", error_code="INVALID_CHALLENGE")

    expected_challenge_b64 = chal_item.get("challenge")

    # Step 4: Verify attestation using py_webauthn
    try:
        # Decode the base64url challenge back to bytes
        # Add padding if needed for proper base64 decode
        padded = expected_challenge_b64 + "=" * (-len(expected_challenge_b64) % 4)
        expected_challenge_bytes = base64.urlsafe_b64decode(padded)

        verification = verify_registration_response(
            credential=credential_dict,
            expected_challenge=expected_challenge_bytes,
            expected_origin=EXPECTED_ORIGIN,
            expected_rp_id=RP_ID,
            require_user_verification=False,  # YubiKey hardware doesn't require PIN by default
        )
    except InvalidRegistrationResponse as e:
        logger.warning("Attestation verification failed: %s", str(e))
        logger.info(json.dumps({
            "audit_event": "passkey_register_failed",
            "user_sub": user_sub,
            "reason": "invalid_attestation",
            "request_id": request_id,
        }))
        return bad_request(
            "Attestation verification failed",
            error_code="INVALID_ATTESTATION",
        )
    except Exception as e:
        logger.exception("Unexpected error during attestation verification")
        return internal_error("Verification failed")

    # Step 5: Store the credential in DynamoDB
    credential_id_bytes = verification.credential_id
    credential_id_b64 = base64.urlsafe_b64encode(credential_id_bytes).decode("utf-8").rstrip("=")
    public_key_b64 = base64.urlsafe_b64encode(verification.credential_public_key).decode("utf-8").rstrip("=")
    aaguid = verification.aaguid if hasattr(verification, "aaguid") else None

    transports = []
    if "response" in credential_dict and "transports" in credential_dict["response"]:
        transports = credential_dict["response"]["transports"]

    iso_now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    try:
        table.put_item(Item={
            "user_sub": user_sub,
            "credential_id": credential_id_b64,
            "public_key": public_key_b64,
            "sign_count": verification.sign_count,
            "transports": transports,
            "aaguid": str(aaguid) if aaguid else "unknown",
            "friendly_name": friendly_name,
            "registered_at": iso_now,
            "last_used_at": None,
        })
    except ClientError:
        logger.exception("Failed to store credential")
        return internal_error("Failed to store credential")

    # Step 6: Clean up the challenge (single-use)
    try:
        table.delete_item(Key={"user_sub": user_sub, "credential_id": challenge_key})
    except ClientError:
        logger.warning("Failed to delete challenge - non-fatal")

    # Step 7: Audit log success
    logger.info(json.dumps({
        "audit_event": "passkey_registered",
        "user_sub": user_sub,
        "credential_id": credential_id_b64[:20] + "...",
        "aaguid": str(aaguid) if aaguid else "unknown",
        "friendly_name": friendly_name,
        "request_id": request_id,
    }))

    return success({
        "status": "registered",
        "credential_id": credential_id_b64,
        "friendly_name": friendly_name,
    })


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
