"""
BIS3 Defense - auth-verify-srp Lambda

Step 2 of the SRP authentication flow.
Receives: { email, session, passwordClaimSignature, timestamp, secretBlock }
Calls Cognito: RespondToAuthChallenge(PASSWORD_VERIFIER)

Cognito's response indicates one of two paths:
  A) MFA required -> return MFA challenge to client (no tokens issued yet)
  B) MFA not required -> issue session cookies (login complete)

For BIS3 Defense, MFA is REQUIRED for all users (Cognito user pool config).
So path B is essentially never reached - all users must complete MFA via
the auth-mfa Lambda before getting tokens.

Federal compliance:
    AC-7    Unsuccessful Logon Attempts
    AU-2    Audit Events
    AU-3    Content of Audit Records
    IA-2    Identification and Authentication
    IA-2(1) MFA for privileged accounts (Cognito enforces)
    IA-2(8) Replay-resistant Authentication (SRP)
    SC-13   Cryptographic Protection (SRP signature verification)
"""

import base64
import json
import logging
import sys

sys.path.insert(0, "/var/task")

from cognito_client import (
    respond_to_auth_challenge,
    audit_log_attempt,
    CognitoError,
)
from responses import (
    success,
    bad_request,
    unauthorized,
    too_many_requests,
    internal_error,
)


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/verify-srp
    
    Request body:
        {
            "email": "user@example.com",
            "session": "<opaque session from /auth/login>",
            "passwordClaimSignature": "<base64 HMAC signature>",
            "timestamp": "<formatted timestamp>",
            "secretBlock": "<base64 echo from /auth/login response>"
        }
    
    Response (MFA required - the typical path):
        {
            "challenge": "SOFTWARE_TOKEN_MFA",
            "session": "<new opaque session token>",
            "mfaType": "TOTP"
        }
    
    Response (no MFA - rarely reached, only if user has MFA disabled):
        {
            "status": "authenticated",
            "user": { ... }
        }
        + Set-Cookie headers (httpOnly access/refresh + CSRF)
    """
    request_id = context.aws_request_id if context else "no-context"
    
    # Step 1: Parse and validate request body
    try:
        body_raw = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            body_raw = base64.b64decode(body_raw).decode("utf-8")
        body = json.loads(body_raw)
    except (json.JSONDecodeError, ValueError, UnicodeDecodeError):
        audit_log_attempt(
            event_type="login_verify",
            success=False,
            error_code="MALFORMED_BODY",
            request_id=request_id,
        )
        return bad_request("Invalid request body", error_code="MALFORMED_BODY")
    
    email = body.get("email")
    session = body.get("session")
    password_claim_signature = body.get("passwordClaimSignature")
    timestamp = body.get("timestamp")
    secret_block = body.get("secretBlock")
    
    # Session may be null/empty for SRP flows where Cognito didn't issue one
    # Convert None to empty string for downstream Cognito SDK call
    if session is None:
        session = ""
    if not isinstance(session, str):
        return bad_request("Missing or invalid field: session", error_code="MISSING_FIELD")

    # Validate other required fields (these CANNOT be empty)
    required_fields = {
        "email": email,
        "passwordClaimSignature": password_claim_signature,
        "timestamp": timestamp,
        "secretBlock": secret_block,
    }
    for field_name, value in required_fields.items():
        if not value or not isinstance(value, str):
            return bad_request(
                f"Missing or invalid field: {field_name}",
                error_code="MISSING_FIELD",
            )
    
    # Length sanity checks
    if len(session) > 8192:
        return bad_request("Session token too long", error_code="INVALID_SESSION")
    if len(password_claim_signature) > 4096:
        return bad_request("Signature too long", error_code="INVALID_SIGNATURE")
    
    # Step 2: Call Cognito RespondToAuthChallenge with PASSWORD_VERIFIER
    try:
        cognito_response = respond_to_auth_challenge(
            challenge_name="PASSWORD_VERIFIER",
            session=session,
            challenge_responses={
                "USERNAME": email,
                "PASSWORD_CLAIM_SIGNATURE": password_claim_signature,
                "PASSWORD_CLAIM_SECRET_BLOCK": secret_block,
                "TIMESTAMP": timestamp,
            },
        )
    except CognitoError as e:
        audit_log_attempt(
            event_type="login_verify",
            username=email,
            success=False,
            error_code=e.code,
            request_id=request_id,
        )
        if e.code == "RATE_LIMITED":
            return too_many_requests(str(e))
        if e.code in ("INVALID_CREDENTIALS", "ACCOUNT_LOCKED"):
            return unauthorized(str(e))
        return bad_request(str(e), error_code=e.code)
    except Exception as e:
        logger.exception("Unexpected error in auth-verify-srp")
        audit_log_attempt(
            event_type="login_verify",
            username=email,
            success=False,
            error_code="INTERNAL_ERROR",
            request_id=request_id,
            extra={"exception_type": type(e).__name__},
        )
        return internal_error()
    
    # Step 3: Branch based on response
    challenge_name = cognito_response.get("ChallengeName")
    
    # PATH A: MFA required (the typical path for BIS3 Defense)
    if challenge_name == "SOFTWARE_TOKEN_MFA":
        new_session = cognito_response.get("Session")
        if not new_session:
            logger.error("SOFTWARE_TOKEN_MFA challenge missing session")
            return internal_error("Authentication flow error")
        
        audit_log_attempt(
            event_type="login_verify",
            username=email,
            success=True,
            request_id=request_id,
            extra={"next_challenge": "SOFTWARE_TOKEN_MFA"},
        )
        
        return success({
            "challenge": "SOFTWARE_TOKEN_MFA",
            "session": new_session,
            "mfaType": "TOTP",
        })
    
    # PATH B: MFA setup required (first-time user without TOTP configured)
    if challenge_name == "MFA_SETUP":
        new_session = cognito_response.get("Session")
        audit_log_attempt(
            event_type="login_verify",
            username=email,
            success=True,
            request_id=request_id,
            extra={"next_challenge": "MFA_SETUP"},
        )
        return success({
            "challenge": "MFA_SETUP",
            "session": new_session,
            "message": "First-time login: MFA setup required",
        })
    
    # PATH C: New password required (admin-issued temp password)
    if challenge_name == "NEW_PASSWORD_REQUIRED":
        new_session = cognito_response.get("Session")
        audit_log_attempt(
            event_type="login_verify",
            username=email,
            success=True,
            request_id=request_id,
            extra={"next_challenge": "NEW_PASSWORD_REQUIRED"},
        )
        return success({
            "challenge": "NEW_PASSWORD_REQUIRED",
            "session": new_session,
            "message": "Password change required before login",
        })
    
    # PATH D: Authenticated immediately (no MFA configured - rare in BIS3 Defense)
    if "AuthenticationResult" in cognito_response:
        # User completed login without MFA - this should be rare for BIS3
        # because we enforce MFA. If we get here, either user pool config
        # changed or this is a special service account.
        # We do NOT issue cookies here for security - require MFA explicitly.
        logger.warning(
            "User %s authenticated without MFA - check user pool config",
            email,
        )
        audit_log_attempt(
            event_type="login_verify",
            username=email,
            success=False,
            error_code="MFA_BYPASS_ATTEMPT",
            request_id=request_id,
        )
        return unauthorized(
            "MFA required - please configure MFA for this account",
        )
    
    # Unexpected response
    logger.error(
        "Unexpected challenge response: %s for user %s",
        challenge_name, email,
    )
    audit_log_attempt(
        event_type="login_verify",
        username=email,
        success=False,
        error_code="UNEXPECTED_CHALLENGE",
        request_id=request_id,
        extra={"actual_challenge": challenge_name},
    )
    return internal_error("Authentication flow error")

# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
