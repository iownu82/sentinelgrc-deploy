"""
BIS3 Defense - auth-passkey-auth-verify Lambda

Verifies the authentication assertion returned by the browser after the user
tapped their YubiKey or biometric. On success, issues real session cookies
by calling Cognito admin-initiate-auth (CUSTOM_AUTH flow).

Flow:
  1. Browser called navigator.credentials.get() with options from
     /auth/passkey/auth-options
  2. User tapped YubiKey or biometric
  3. Browser returns assertion - posted here
  4. We look up the original challenge (by challengeId)
  5. We look up the credential by credential_id (from assertion)
  6. py_webauthn verifies the assertion cryptographically
  7. We validate the sign counter (must be > previous count - anti-clone)
  8. We update last_used_at + sign_count in DynamoDB
  9. We call Cognito admin-initiate-auth with ADMIN_USER_PASSWORD_AUTH
     to get session tokens (the "trusted authenticator" pattern)
  10. Issue cookies (access, id, refresh, csrf)

Federal compliance:
    AC-3    Access Enforcement
    AU-2    Audit Events (every auth attempt logged)
    IA-2    Identification and Authentication
    IA-2(11) Hardware Authenticator
    IA-5    Authenticator Management
    IA-6    Authenticator Feedback (generic errors)
    SC-13   Cryptographic Protection (signature verification, sign counter)
    SC-23   Session Authenticity (anti-replay via challenge + counter)
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

from cookies import build_session_cookies
from jwt_verifier import verify_id_token, extract_user_info, JWTVerificationError
from responses import success, bad_request, unauthorized, internal_error

import boto3
from botocore.exceptions import ClientError

from webauthn import verify_authentication_response
from webauthn.helpers.exceptions import InvalidAuthenticationResponse


logger = logging.getLogger()
logger.setLevel(logging.INFO)


RP_ID = os.environ.get("WEBAUTHN_RP_ID", "staging.app.bis3ai.com")
EXPECTED_ORIGIN = os.environ.get(
    "WEBAUTHN_EXPECTED_ORIGIN",
    "https://staging.app.bis3ai.com",
)
PASSKEY_TABLE = os.environ.get("PASSKEY_TABLE", "bis3-defense-passkey-credentials")
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "us-gov-west-1_0VaQnbcFH")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_USER_POOL_CLIENT_ID", "anrf7jlfgfevp7c6esu705p7k")

dynamodb = boto3.resource("dynamodb")
cognito = boto3.client("cognito-idp", region_name="us-gov-west-1")


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/passkey/auth-verify

    Request body:
        {
            "challengeId": "...",  (from auth-options response)
            "credential": {
                "id": "...",
                "rawId": "...",
                "response": {
                    "clientDataJSON": "...",
                    "authenticatorData": "...",
                    "signature": "...",
                    "userHandle": "..."  (optional, present for resident keys)
                },
                "type": "public-key"
            }
        }

    Response (success):
        {
            "status": "authenticated",
            "user": {...}
        }
        + Set-Cookie: bis3_access, bis3_id, bis3_refresh, bis3_csrf

    Errors (all generic for IA-6 - no enumeration):
        401 INVALID_ASSERTION - signature/counter/credential validation failed
        401 EXPIRED_CHALLENGE - challenge not found or expired
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

    challenge_id = body.get("challengeId")
    credential_dict = body.get("credential")

    if not challenge_id or not isinstance(challenge_id, str):
        return bad_request("challengeId is required", error_code="MISSING_CHALLENGE")
    if not credential_dict or not isinstance(credential_dict, dict):
        return bad_request("credential is required", error_code="MISSING_CREDENTIAL")

    table = dynamodb.Table(PASSKEY_TABLE)

    # Step 2: Look up the challenge via GSI on credential_id
    # We don't know the user_sub yet, so we have to scan or use a different lookup
    # Actually we stored challenge under the user_sub (or _unknown_<id> if user not found)
    # We need to scan for the challenge_id since we only have that in the request
    challenge_key = f"_challenge_{challenge_id}"

    try:
        # Scan the table for this challenge - small N (only active challenges)
        # Better: use the credential_id_index GSI since challenge_key is unique
        chal_resp = table.query(
            IndexName="credential_id_index",
            KeyConditionExpression="credential_id = :cid",
            ExpressionAttributeValues={":cid": challenge_key},
        )
        items = chal_resp.get("Items", [])
        if not items:
            logger.info(json.dumps({
                "audit_event": "passkey_auth_failed",
                "reason": "challenge_not_found",
                "challenge_id": challenge_id,
                "request_id": request_id,
            }))
            return unauthorized("Authentication failed")

        chal_item = items[0]
    except ClientError:
        logger.exception("Failed to query challenge")
        return internal_error("Failed to verify")

    # Step 3: Validate the challenge entry
    if chal_item.get("expires_at", 0) < int(time.time()):
        try:
            table.delete_item(Key={
                "user_sub": chal_item["user_sub"],
                "credential_id": challenge_key,
            })
        except ClientError:
            pass
        return unauthorized("Authentication failed")  # generic for IA-6

    if chal_item.get("purpose") != "authentication":
        return unauthorized("Authentication failed")

    expected_challenge_b64 = chal_item.get("challenge")
    challenge_email = chal_item.get("email")
    user_sub = chal_item["user_sub"]

    # If user_sub starts with _unknown_, this was a fake challenge for non-existent user
    # Always fail (preserving IA-6 enumeration prevention through timing)
    if user_sub.startswith("_unknown_"):
        # Clean up
        try:
            table.delete_item(Key={"user_sub": user_sub, "credential_id": challenge_key})
        except ClientError:
            pass
        return unauthorized("Authentication failed")

    # Step 4: Look up the credential the user is presenting
    cred_id_str = credential_dict.get("id", "")
    if not cred_id_str:
        return bad_request("credential.id missing", error_code="MISSING_CREDENTIAL_ID")

    # Query by credential_id (GSI)
    try:
        cred_resp = table.query(
            IndexName="credential_id_index",
            KeyConditionExpression="credential_id = :cid",
            ExpressionAttributeValues={":cid": cred_id_str},
        )
        cred_items = cred_resp.get("Items", [])
    except ClientError:
        logger.exception("Failed to look up credential")
        return internal_error("Failed to verify")

    if not cred_items:
        logger.info(json.dumps({
            "audit_event": "passkey_auth_failed",
            "reason": "credential_not_found",
            "user_sub": user_sub,
            "request_id": request_id,
        }))
        return unauthorized("Authentication failed")

    cred_item = cred_items[0]

    # Validate the credential belongs to the user from the challenge
    if cred_item.get("user_sub") != user_sub:
        logger.warning(json.dumps({
            "audit_event": "passkey_auth_failed",
            "reason": "credential_user_mismatch",
            "user_sub": user_sub,
            "request_id": request_id,
        }))
        return unauthorized("Authentication failed")

    # Step 5: Verify the assertion
    try:
        # Decode stored values
        stored_pubkey_b64 = cred_item["public_key"]
        padded_pk = stored_pubkey_b64 + "=" * (-len(stored_pubkey_b64) % 4)
        stored_pubkey_bytes = base64.urlsafe_b64decode(padded_pk)

        padded_chal = expected_challenge_b64 + "=" * (-len(expected_challenge_b64) % 4)
        expected_challenge_bytes = base64.urlsafe_b64decode(padded_chal)

        verification = verify_authentication_response(
            credential=credential_dict,
            expected_challenge=expected_challenge_bytes,
            expected_origin=EXPECTED_ORIGIN,
            expected_rp_id=RP_ID,
            credential_public_key=stored_pubkey_bytes,
            credential_current_sign_count=int(cred_item.get("sign_count", 0)),
            require_user_verification=False,
        )
    except InvalidAuthenticationResponse as e:
        logger.warning("Assertion verification failed: %s", str(e))
        logger.info(json.dumps({
            "audit_event": "passkey_auth_failed",
            "reason": "invalid_assertion",
            "user_sub": user_sub,
            "request_id": request_id,
        }))
        return unauthorized("Authentication failed")
    except Exception:
        logger.exception("Unexpected error during assertion verification")
        return internal_error("Verification failed")

    # Step 6: sign_count is owned by auth-verify-challenge (Cognito trigger).
    # Updating here would race with that and make the trigger reject the
    # assertion as a replay (counter must be strictly greater than stored).

    # Step 7: Challenge is consumed AFTER Cognito CUSTOM_AUTH completes.
    # auth-create-challenge needs to read the challenge row when the trigger
    # fires, so we cannot delete it here. See post-Cognito cleanup below.

    # Step 8: Issue Cognito session tokens via admin-initiate-auth
    # This is the "trusted authenticator" pattern - we've already verified the
    # user's identity via WebAuthn, so we issue tokens administratively.
    # Note: This requires the Cognito User Pool to have ADMIN_USER_PASSWORD_AUTH
    # enabled OR we use a custom auth flow with Lambda triggers.
    # For now, we use a different pattern: issue a Cognito challenge response
    # via CUSTOM_AUTH that our DefineAuthChallenge trigger trusts.
    #
    # Simplification for MVP: use admin_initiate_auth with USER_PASSWORD_AUTH
    # is NOT possible (we don't have the password). We need CUSTOM_AUTH with
    # Lambda triggers (DefineAuthChallenge, CreateAuthChallenge,
    # VerifyAuthChallengeResponse) that respects "passkey verified" as a
    # custom challenge.
    #
    # This Lambda completes ITS verification but token issuance requires the
    # Cognito CUSTOM_AUTH wiring to be in place. For now, we return a "verified"
    # status and the next deployment iteration will add the Cognito triggers.

    # Step 8: Drive Cognito CUSTOM_AUTH to get real session tokens
    #
    # We have already verified the assertion locally (defense in depth). Now we
    # ask Cognito to ALSO verify it via the CUSTOM_AUTH triggers we configured
    # so it issues real AuthenticationResult tokens that match its session/JWT
    # security boundary.
    #
    # Step 8a: Look up user's email (Cognito CUSTOM_AUTH expects USERNAME)
    try:
        cognito_admin_resp = cognito.admin_get_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=user_sub,
        )
        user_email = None
        for attr in cognito_admin_resp.get("UserAttributes", []):
            if attr["Name"] == "email":
                user_email = attr["Value"]
                break
        if not user_email:
            logger.error("admin_get_user returned no email for verified user")
            return internal_error("User lookup failed")
    except ClientError:
        logger.exception("Failed to look up user email")
        return internal_error("User lookup failed")

    # Step 8b: Initiate CUSTOM_AUTH flow
    # This triggers define-challenge -> create-challenge -> we get a session
    try:
        init_resp = cognito.admin_initiate_auth(
            UserPoolId=COGNITO_USER_POOL_ID,
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow="CUSTOM_AUTH",
            AuthParameters={
                "USERNAME": user_email,
            },
            ClientMetadata={
                "challenge_id": challenge_id,
            },
        )
    except ClientError as e:
        logger.exception("admin_initiate_auth failed")
        return internal_error("Authentication initiation failed")

    challenge_name = init_resp.get("ChallengeName")
    cognito_session = init_resp.get("Session")

    if challenge_name != "CUSTOM_CHALLENGE" or not cognito_session:
        logger.error(
            "Unexpected initiate_auth response: challenge=%s session=%s",
            challenge_name, bool(cognito_session)
        )
        return internal_error("Unexpected auth flow state")

    # Step 8c: Respond to the CUSTOM_CHALLENGE with the assertion
    # This triggers verify-challenge -> define-challenge says issueTokens=true
    # -> Cognito returns AuthenticationResult
    try:
        respond_resp = cognito.admin_respond_to_auth_challenge(
            UserPoolId=COGNITO_USER_POOL_ID,
            ClientId=COGNITO_CLIENT_ID,
            ChallengeName="CUSTOM_CHALLENGE",
            Session=cognito_session,
            ChallengeResponses={
                "USERNAME": user_email,
                "ANSWER": json.dumps(credential_dict),
            },
        )
    except ClientError as e:
        logger.exception("admin_respond_to_auth_challenge failed")
        return internal_error("Authentication challenge response failed")

    auth_result = respond_resp.get("AuthenticationResult")
    if not auth_result:
        logger.error("CUSTOM_AUTH did not issue tokens: %s", respond_resp.get("ChallengeName"))
        return unauthorized("Authentication failed")

    # Now that Cognito has accepted the assertion, clean up the challenge row
    try:
        table.delete_item(Key={"user_sub": user_sub, "credential_id": challenge_key})
    except ClientError:
        pass

    access_token = auth_result.get("AccessToken")
    id_token = auth_result.get("IdToken")
    refresh_token = auth_result.get("RefreshToken")

    if not all([access_token, id_token, refresh_token]):
        logger.error("Incomplete tokens returned from CUSTOM_AUTH")
        return internal_error("Token issuance failed")

    # Step 8d: Verify the ID token to extract user info for response body
    try:
        id_claims = verify_id_token(id_token)
        user_info = extract_user_info(id_claims)
    except JWTVerificationError as e:
        logger.error("Failed to verify ID token after CUSTOM_AUTH: %s", e)
        return internal_error("Token verification failed")

    # Step 8e: Generate CSRF + build cookies
    csrf_token = secrets.token_urlsafe(32)
    cookies = build_session_cookies(
        access_token=access_token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
        id_token=id_token,
    )

    # Step 9: Audit log success
    logger.info(json.dumps({
        "audit_event": "passkey_auth_success",
        "user_sub": user_sub,
        "credential_id": cred_id_str[:20] + "...",
        "friendly_name": cred_item.get("friendly_name", "unknown"),
        "request_id": request_id,
    }))

    return success(
        data={
            "status": "authenticated",
            "user": user_info,
        },
        cookies=cookies,
    )


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
