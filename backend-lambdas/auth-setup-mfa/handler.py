"""
BIS3 Defense - auth-setup-mfa Lambda

Handles TOTP MFA setup for users who hit MFA_SETUP challenge during login.
This Lambda has TWO phases controlled by request body 'phase' field:

PHASE 1 (phase="associate"):
    Receives: { phase: "associate", session: <from MFA_SETUP challenge> }
    Calls Cognito: AssociateSoftwareToken
    Returns: { secretCode, session } — client renders QR code from secret

PHASE 2 (phase="verify"):
    Receives: { phase: "verify", session: <from associate>, totpCode, friendlyDeviceName }
    Calls Cognito: VerifySoftwareToken (records the TOTP)
    Then: RespondToAuthChallenge(MFA_SETUP) to complete the auth flow
    Returns: AuthenticationResult tokens via httpOnly cookies + user info

After phase 2 succeeds, the user has a verified TOTP device AND is logged in
with valid session cookies. Future logins go through standard SRP -> SOFTWARE_TOKEN_MFA flow.

Federal compliance:
    AC-3    Access Enforcement (cookies issued only after MFA verification)
    AU-2    Audit Events (every step logged)
    AU-3    Content of Audit Records
    IA-2    Identification and Authentication
    IA-2(1) MFA for privileged accounts (we're CONFIGURING MFA here)
    IA-2(8) Replay-resistant Authentication
    IA-5    Authenticator Management (TOTP secret IS the authenticator)
    SC-13   Cryptographic Protection (TOTP via RFC 6238)
"""

import base64
import json
import logging
import secrets
import sys

sys.path.insert(0, "/var/task")

from cognito_client import (
    associate_software_token,
    verify_software_token,
    respond_to_auth_challenge,
    audit_log_attempt,
    CognitoError,
)
from cookies import build_session_cookies
from jwt_verifier import (
    verify_id_token,
    extract_user_info,
    JWTVerificationError,
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
    POST /auth/setup-mfa
    
    Request body for PHASE 1 (associate):
        {
            "phase": "associate",
            "session": "<opaque session from MFA_SETUP challenge>",
            "email": "user@example.com"
        }
    
    Response PHASE 1:
        {
            "phase": "associate",
            "secretCode": "<base32 TOTP secret>",
            "session": "<new session for verify phase>",
            "qrCodeUri": "otpauth://totp/BIS3%20Defense:user@example.com?secret=...&issuer=BIS3%20Defense"
        }
    
    Request body for PHASE 2 (verify):
        {
            "phase": "verify",
            "session": "<session from associate phase>",
            "email": "user@example.com",
            "totpCode": "123456",
            "friendlyDeviceName": "iPhone Authenticator" (optional)
        }
    
    Response PHASE 2 (success):
        {
            "phase": "verify",
            "status": "mfa_configured",
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
            event_type="mfa_setup",
            success=False,
            error_code="MALFORMED_BODY",
            request_id=request_id,
        )
        return bad_request("Invalid request body", error_code="MALFORMED_BODY")
    
    phase = body.get("phase")
    session = body.get("session")
    email = body.get("email")
    
    if phase not in ("associate", "verify"):
        return bad_request(
            "Phase must be 'associate' or 'verify'",
            error_code="INVALID_PHASE",
        )
    if not session or not isinstance(session, str):
        return bad_request("Session is required", error_code="MISSING_SESSION")
    if not email or not isinstance(email, str):
        return bad_request("Email is required", error_code="MISSING_EMAIL")
    
    # Length sanity
    if len(session) < 20:
        return bad_request("Invalid session token", error_code="INVALID_SESSION")
    if len(session) > 8192:
        return bad_request("Session token too long", error_code="INVALID_SESSION")
    
    # ========================================================================
    # PHASE 1: ASSOCIATE
    # ========================================================================
    if phase == "associate":
        try:
            response = associate_software_token(session=session)
        except CognitoError as e:
            audit_log_attempt(
                event_type="mfa_setup_associate",
                username=email,
                success=False,
                error_code=e.code,
                request_id=request_id,
            )
            if e.code == "RATE_LIMITED":
                return too_many_requests(str(e))
            return bad_request(str(e), error_code=e.code)
        except Exception as e:
            logger.exception("Unexpected error in MFA associate")
            audit_log_attempt(
                event_type="mfa_setup_associate",
                username=email,
                success=False,
                error_code="INTERNAL_ERROR",
                request_id=request_id,
                extra={"exception_type": type(e).__name__},
            )
            return internal_error()
        
        secret_code = response.get("SecretCode")
        new_session = response.get("Session")
        
        if not secret_code or not new_session:
            logger.error("AssociateSoftwareToken returned incomplete response")
            return internal_error("MFA setup failed")
        
        # Build the otpauth:// URI for QR code rendering
        # Format: otpauth://totp/<issuer>:<account>?secret=<secret>&issuer=<issuer>
        # Authenticator apps (Google Authenticator, Authy, 1Password, etc.) parse this
        from urllib.parse import quote
        issuer = "BIS3 Defense"
        qr_code_uri = (
            f"otpauth://totp/{quote(issuer)}:{quote(email)}"
            f"?secret={secret_code}&issuer={quote(issuer)}"
        )
        
        audit_log_attempt(
            event_type="mfa_setup_associate",
            username=email,
            success=True,
            request_id=request_id,
        )
        
        return success({
            "phase": "associate",
            "secretCode": secret_code,
            "session": new_session,
            "qrCodeUri": qr_code_uri,
        })
    
    # ========================================================================
    # PHASE 2: VERIFY
    # ========================================================================
    totp_code = body.get("totpCode")
    friendly_device_name = body.get("friendlyDeviceName") or "BIS3 Defense TOTP"
    
    if not totp_code or not isinstance(totp_code, str):
        return bad_request("TOTP code is required", error_code="MISSING_TOTP")
    if not totp_code.isdigit() or len(totp_code) != 6:
        return bad_request(
            "TOTP code must be 6 digits",
            error_code="INVALID_TOTP_FORMAT",
        )
    if len(friendly_device_name) > 256:
        friendly_device_name = friendly_device_name[:256]
    
    # Step 2a: Verify the TOTP code (records the TOTP factor in Cognito)
    try:
        verify_response = verify_software_token(
            user_code=totp_code,
            session=session,
            friendly_device_name=friendly_device_name,
        )
    except CognitoError as e:
        audit_log_attempt(
            event_type="mfa_setup_verify",
            username=email,
            success=False,
            error_code=e.code,
            request_id=request_id,
        )
        if e.code == "RATE_LIMITED":
            return too_many_requests(str(e))
        if e.code in ("INVALID_MFA", "EXPIRED_MFA"):
            return unauthorized(str(e))
        return bad_request(str(e), error_code=e.code)
    except Exception as e:
        logger.exception("Unexpected error in MFA verify")
        audit_log_attempt(
            event_type="mfa_setup_verify",
            username=email,
            success=False,
            error_code="INTERNAL_ERROR",
            request_id=request_id,
            extra={"exception_type": type(e).__name__},
        )
        return internal_error()
    
    if verify_response.get("Status") != "SUCCESS":
        audit_log_attempt(
            event_type="mfa_setup_verify",
            username=email,
            success=False,
            error_code="VERIFY_FAILED",
            request_id=request_id,
        )
        return unauthorized("MFA verification failed - incorrect code")
    
    verify_session = verify_response.get("Session")
    if not verify_session:
        logger.error("VerifySoftwareToken returned SUCCESS without session")
        return internal_error("MFA setup flow error")
    
    # Step 2b: Complete the auth flow with MFA_SETUP challenge response
    # Now that TOTP is verified, Cognito issues actual auth tokens
    try:
        challenge_response = respond_to_auth_challenge(
            challenge_name="MFA_SETUP",
            session=verify_session,
            challenge_responses={
                "USERNAME": email,
            },
        )
    except CognitoError as e:
        audit_log_attempt(
            event_type="mfa_setup_complete",
            username=email,
            success=False,
            error_code=e.code,
            request_id=request_id,
        )
        return bad_request(str(e), error_code=e.code)
    except Exception as e:
        logger.exception("Unexpected error in MFA setup challenge response")
        return internal_error()
    
    auth_result = challenge_response.get("AuthenticationResult")
    if not auth_result:
        logger.error("MFA_SETUP challenge response missing AuthenticationResult")
        return internal_error("MFA setup flow error")
    
    access_token = auth_result.get("AccessToken")
    id_token = auth_result.get("IdToken")
    refresh_token = auth_result.get("RefreshToken")
    
    if not all([access_token, id_token, refresh_token]):
        logger.error("Incomplete tokens after MFA setup")
        return internal_error("Token issuance failed")
    
    # Step 2c: Verify the ID token to extract user info
    try:
        id_claims = verify_id_token(id_token)
        user_info = extract_user_info(id_claims)
    except JWTVerificationError as e:
        logger.error("Failed to verify ID token after MFA setup: %s", e)
        return internal_error("Token verification failed")
    
    # Step 2d: Generate CSRF + build cookies
    csrf_token = secrets.token_urlsafe(32)
    cookies = build_session_cookies(
        access_token=access_token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
        id_token=id_token,
    )
    
    # Step 2e: Audit log success
    audit_log_attempt(
        event_type="mfa_setup_complete",
        username=email,
        success=True,
        request_id=request_id,
        extra={
            "user_id": user_info.get("user_id"),
            "device_name": friendly_device_name,
        },
    )
    
    return success(
        data={
            "phase": "verify",
            "status": "mfa_configured",
            "user": user_info,
        },
        cookies=cookies,
    )


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
