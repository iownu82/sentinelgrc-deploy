"""
BIS3 Defense - auth-passkey-auth-options Lambda

Generates a WebAuthn authentication challenge for a user attempting to log in
with their previously-registered passkey or YubiKey.

Flow:
  1. User submits email - we look up their registered credential IDs
  2. Lambda generates a random challenge
  3. Returns options (challenge + allowed credential IDs) to client
  4. Client passes options to navigator.credentials.get() WebAuthn API
  5. User taps YubiKey or biometric
  6. Browser returns assertion - sent to /auth/passkey/auth-verify

Federal compliance:
    AC-3    Access Enforcement
    AU-2    Audit Events
    IA-2    Identification and Authentication
    IA-2(11) Hardware Authenticator (YubiKey)
    IA-6    Authenticator Feedback (no enumeration - same response if user not found)
    SC-13   Cryptographic Protection (challenge is cryptographically random)
"""

import base64
import json
import logging
import os
import secrets
import sys
import time

sys.path.insert(0, "/var/task")
sys.path.insert(0, "/opt/python")  # Lambda layer path

from responses import success, bad_request, internal_error

import boto3
from botocore.exceptions import ClientError

from webauthn import generate_authentication_options, options_to_json
from webauthn.helpers.structs import (
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
)


logger = logging.getLogger()
logger.setLevel(logging.INFO)


RP_ID = os.environ.get("WEBAUTHN_RP_ID", "staging.app.bis3ai.com")
PASSKEY_TABLE = os.environ.get("PASSKEY_TABLE", "bis3-defense-passkey-credentials")
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "us-gov-west-1_0VaQnbcFH")

CHALLENGE_TTL_SECONDS = 300  # 5 minutes

dynamodb = boto3.resource("dynamodb")
cognito = boto3.client("cognito-idp", region_name="us-gov-west-1")


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/passkey/auth-options

    Request body:
        {
            "email": "user@example.com"
        }

    Response (always - even for non-existent users, IA-6 enumeration prevention):
        {
            "options": {
                "rpId": "staging.app.bis3ai.com",
                "challenge": "...",
                "timeout": 60000,
                "allowCredentials": [...],
                "userVerification": "preferred"
            },
            "challengeId": "..."
        }
    """
    request_id = context.aws_request_id if context else "no-context"

    # Step 1: Parse request body
    try:
        body_raw = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            body_raw = base64.b64decode(body_raw).decode("utf-8")
        body = json.loads(body_raw)
    except (json.JSONDecodeError, ValueError, UnicodeDecodeError):
        return bad_request("Invalid request body", error_code="MALFORMED_BODY")

    email = body.get("email")
    if not email or not isinstance(email, str):
        return bad_request("Email is required", error_code="MISSING_EMAIL")
    if len(email) > 256 or "@" not in email:
        return bad_request("Invalid email format", error_code="INVALID_EMAIL")

    # Step 2: Look up the user's sub from Cognito (email -> user_sub)
    # Note: We return generic challenge even if user doesn't exist (IA-6)
    user_sub = None
    try:
        cognito_resp = cognito.admin_get_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email,
        )
        for attr in cognito_resp.get("UserAttributes", []):
            if attr["Name"] == "sub":
                user_sub = attr["Value"]
                break
    except cognito.exceptions.UserNotFoundException:
        # IA-6: don't reveal user existence
        logger.info(json.dumps({
            "audit_event": "passkey_auth_options_user_not_found",
            "email": email,
            "request_id": request_id,
        }))
    except ClientError as e:
        logger.exception("Failed to look up user")
        return internal_error("Failed to process request")

    # Step 3: Look up registered credentials for this user
    allow_credentials_descriptors = []
    if user_sub:
        try:
            table = dynamodb.Table(PASSKEY_TABLE)
            resp = table.query(
                KeyConditionExpression="user_sub = :sub",
                ExpressionAttributeValues={":sub": user_sub},
            )
            items = resp.get("Items", [])
            for item in items:
                cred_id_str = item.get("credential_id", "")
                # Skip challenge entries (prefixed with _challenge_)
                if cred_id_str.startswith("_challenge_"):
                    continue
                # Decode base64url credential id
                padded = cred_id_str + "=" * (-len(cred_id_str) % 4)
                try:
                    cred_id_bytes = base64.urlsafe_b64decode(padded)
                    transports = item.get("transports", [])
                    allow_credentials_descriptors.append(
                        PublicKeyCredentialDescriptor(
                            id=cred_id_bytes,
                            transports=transports if transports else None,
                        )
                    )
                except Exception:
                    logger.warning("Skipping malformed credential id")
                    continue
        except ClientError:
            logger.exception("Failed to query credentials")
            # Don't reveal failure to user - issue generic challenge

    # Step 4: Generate authentication challenge using py_webauthn
    try:
        options = generate_authentication_options(
            rp_id=RP_ID,
            timeout=60000,
            allow_credentials=allow_credentials_descriptors if allow_credentials_descriptors else None,
            user_verification=UserVerificationRequirement.PREFERRED,
        )
    except Exception:
        logger.exception("Failed to generate authentication options")
        return internal_error("Failed to generate challenge")

    # Step 5: Save the challenge to DynamoDB with TTL
    challenge_b64 = base64.urlsafe_b64encode(options.challenge).decode("utf-8").rstrip("=")
    challenge_id = secrets.token_urlsafe(16)
    expires_at = int(time.time()) + CHALLENGE_TTL_SECONDS

    # Use a synthetic user_sub for unknown users so IA-6 enumeration is preserved
    # (we still write a challenge entry, but verify will fail)
    challenge_user_sub = user_sub or f"_unknown_{challenge_id}"

    try:
        table = dynamodb.Table(PASSKEY_TABLE)
        table.put_item(Item={
            "user_sub": challenge_user_sub,
            "credential_id": f"_challenge_{challenge_id}",
            "challenge": challenge_b64,
            "purpose": "authentication",
            "email": email,
            "expires_at": expires_at,
        })
    except ClientError:
        logger.exception("Failed to save challenge")
        return internal_error("Failed to issue challenge")

    # Step 6: Audit log
    logger.info(json.dumps({
        "audit_event": "passkey_auth_options_issued",
        "email": email,
        "user_found": bool(user_sub),
        "challenge_id": challenge_id,
        "credentials_count": len(allow_credentials_descriptors),
        "request_id": request_id,
    }))

    # Flatten WebAuthn options to top level for @simplewebauthn/browser compatibility.
    options_dict = json.loads(options_to_json(options))
    response_body = {
        **options_dict,
        "challengeId": challenge_id,
        "expiresIn": CHALLENGE_TTL_SECONDS,
    }
    return success(response_body)


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
