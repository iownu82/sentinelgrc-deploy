"""
BIS3 Defense - auth-mfa Lambda

Step 3 (final) of the SRP authentication flow.
Receives: { email, session, totpCode }
Calls Cognito: RespondToAuthChallenge(SOFTWARE_TOKEN_MFA)

If TOTP is valid, Cognito returns AccessToken + IdToken + RefreshToken.
This Lambda packages those into httpOnly cookies and returns them to client.

After this Lambda succeeds, the user has a valid session and can access
protected resources.

Federal compliance:
    AC-3    Access Enforcement (cookies are the access enforcement mechanism)
    AC-12   Session Termination (cookies have explicit Max-Age)
    AU-2    Audit Events
    AU-3    Content of Audit Records
    IA-2    Identification and Authentication
    IA-2(1) MFA for privileged accounts (TOTP enforced)
    IA-2(8) Replay-resistant Authentication
    SC-8    Transmission Confidentiality (TLS 1.2+ + Secure cookies)
    SC-23   Session Authenticity (httpOnly + SameSite=Strict cookies)
"""

import base64
import json
import logging
import secrets
import sys

sys.path.insert(0, "/var/task")

from cognito_client import (
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
    POST /auth/mfa
    
    Request body:
        {
            "email": "user@example.com",
            "session": "<opaque session from /auth/verify-srp>",
            "totpCode": "123456"
        }
    
    Response (success):
        {
            "status": "authenticated",
            "user": {
                "user_id": "<cognito sub>",
                "username": "...",
                "email": "...",
                "groups": [...],
                "role": "...",
                "tenant_id": "..."
            }
        }
        + Set-Cookie: bis3_access=... ; Domain=api.staging.app.bis3ai.com; HttpOnly; Secure; SameSite=Strict
        + Set-Cookie: bis3_refresh=... ; (same attrs, 30-day max-age)
        + Set-Cookie: bis3_csrf=... ; (NOT httpOnly so JS can read it)
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
            event_type="login_mfa",
            success=False,
            error_code="MALFORMED_BODY",
            request_id=request_id,
        )
        return bad_request("Invalid request body", error_code="MALFORMED_BODY")
    
    email = body.get("email")
    session = body.get("session")
    totp_code = body.get("totpCode")
    
    # Validate required fields
    if not email or not isinstance(email, str):
        return bad_request("Email is required", error_code="MISSING_EMAIL")
    if not session or not isinstance(session, str):
        return bad_request("Session is required", error_code="MISSING_SESSION")
    if not totp_code or not isinstance(totp_code, str):
        return bad_request("TOTP code is required", error_code="MISSING_TOTP")
    
    # TOTP code must be exactly 6 digits (RFC 6238 standard)
    if not totp_code.isdigit() or len(totp_code) != 6:
        audit_log_attempt(
            event_type="login_mfa",
            username=email,
            success=False,
            error_code="INVALID_TOTP_FORMAT",
            request_id=request_id,
        )
        return bad_request(
            "TOTP code must be 6 digits",
            error_code="INVALID_TOTP_FORMAT",
        )
    
    # Length sanity check on session
    if len(session) > 8192:
        return bad_request("Session token too long", error_code="INVALID_SESSION")
    
    # Step 2: Call Cognito RespondToAuthChallenge with SOFTWARE_TOKEN_MFA
    try:
        cognito_response = respond_to_auth_challenge(
            challenge_name="SOFTWARE_TOKEN_MFA",
            session=session,
            challenge_responses={
                "USERNAME": email,
                "SOFTWARE_TOKEN_MFA_CODE": totp_code,
            },
        )
    except CognitoError as e:
        audit_log_attempt(
            event_type="login_mfa",
            username=email,
            success=False,
            error_code=e.code,
            request_id=request_id,
        )
        if e.code == "RATE_LIMITED":
            return too_many_requests(str(e))
        if e.code in ("INVALID_MFA", "EXPIRED_MFA"):
            return unauthorized(str(e))
        if e.code in ("INVALID_CREDENTIALS", "ACCOUNT_LOCKED"):
            return unauthorized(str(e))
        return bad_request(str(e), error_code=e.code)
    except Exception as e:
        logger.exception("Unexpected error in auth-mfa")
        audit_log_attempt(
            event_type="login_mfa",
            username=email,
            success=False,
            error_code="INTERNAL_ERROR",
            request_id=request_id,
            extra={"exception_type": type(e).__name__},
        )
        return internal_error()
    
    # Step 3: Extract authentication tokens from Cognito response
    auth_result = cognito_response.get("AuthenticationResult")
    
    if not auth_result:
        # No tokens issued - check if Cognito returned another challenge
        challenge_name = cognito_response.get("ChallengeName")
        logger.error(
            "auth-mfa expected AuthenticationResult, got challenge: %s for user %s",
            challenge_name, email,
        )
        audit_log_attempt(
            event_type="login_mfa",
            username=email,
            success=False,
            error_code="NO_TOKENS_ISSUED",
            request_id=request_id,
            extra={"unexpected_challenge": challenge_name},
        )
        return internal_error("Authentication flow error")
    
    access_token = auth_result.get("AccessToken")
    id_token = auth_result.get("IdToken")
    refresh_token = auth_result.get("RefreshToken")
    
    if not all([access_token, id_token, refresh_token]):
        logger.error("Cognito returned incomplete token set for %s", email)
        audit_log_attempt(
            event_type="login_mfa",
            username=email,
            success=False,
            error_code="INCOMPLETE_TOKENS",
            request_id=request_id,
        )
        return internal_error("Authentication flow error")
    
    # Step 4: Verify the ID token to extract user info for response
    # We trust Cognito's response, but verifying tokens before sending them
    # in cookies is a defense-in-depth measure
    try:
        id_claims = verify_id_token(id_token)
        user_info = extract_user_info(id_claims)
    except JWTVerificationError as e:
        # This should never happen for tokens we just got from Cognito,
        # but if it does it's a serious problem
        logger.error("Failed to verify ID token from Cognito for %s: %s", email, e)
        audit_log_attempt(
            event_type="login_mfa",
            username=email,
            success=False,
            error_code="ID_TOKEN_VERIFICATION_FAILED",
            request_id=request_id,
        )
        return internal_error("Token verification failed")
    
    # Step 5: Generate CSRF token (random URL-safe string)
    # Stored in non-httpOnly cookie + sent in X-CSRF-Token header by client
    csrf_token = secrets.token_urlsafe(32)
    
    # Step 6: Build session cookies
    cookies = build_session_cookies(
        access_token=access_token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
    )
    
    # Step 7: Audit log success
    audit_log_attempt(
        event_type="login_complete",
        username=email,
        success=True,
        request_id=request_id,
        extra={
            "user_id": user_info.get("user_id"),
            "groups": user_info.get("groups"),
        },
    )
    
    # Step 8: Return success with user info + cookies
    return success(
        data={
            "status": "authenticated",
            "user": user_info,
        },
        cookies=cookies,
    )

# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
