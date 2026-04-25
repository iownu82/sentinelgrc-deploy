"""
BIS3 Defense - auth-refresh Lambda

Issues a new access token using the refresh token from the httpOnly cookie.
Frontend calls this when access token nears expiry (or on 401 from another endpoint).

Cognito's REFRESH_TOKEN_AUTH flow:
- Input: refresh token
- Output: new access token + id token (refresh token NOT regenerated)

After refresh:
- Access token cookie updated with new value (1h lifetime)
- ID token cookie updated (used for user info)
- Refresh token cookie unchanged (still valid for 30 days)
- New CSRF token issued

Federal compliance:
    AC-12   Session Termination - refresh tokens auto-expire after 30d
    AU-2    Audit Events
    IA-2    Identification and Authentication
    IA-2(8) Replay-resistant Authentication (refresh tokens single-use? Cognito allows reuse but tracks)
    SC-23   Session Authenticity
"""

import logging
import secrets
import sys

sys.path.insert(0, "/var/task")

from cognito_client import (
    initiate_auth,
    audit_log_attempt,
    CognitoError,
)
from cookies import (
    parse_cookies,
    build_access_token_cookie,
    build_csrf_cookie,
    REFRESH_TOKEN_COOKIE,
)
from jwt_verifier import (
    verify_access_token,
    extract_user_info,
    JWTVerificationError,
)
from responses import success, unauthorized, internal_error


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/refresh
    
    No request body required (uses cookies).
    
    Response (success):
        {
            "status": "refreshed",
            "user": { ... }
        }
        + Set-Cookie: bis3_access=<new_token>
        + Set-Cookie: bis3_csrf=<new_csrf>
    
    Response (failure):
        401 Unauthorized (refresh token expired/invalid/revoked)
    """
    request_id = context.aws_request_id if context else "no-context"
    
    # Step 1: Extract refresh token from cookies
    cookies = parse_cookies(event)
    refresh_token = cookies.get(REFRESH_TOKEN_COOKIE)
    
    if not refresh_token:
        audit_log_attempt(
            event_type="token_refresh",
            success=False,
            error_code="NO_REFRESH_TOKEN",
            request_id=request_id,
        )
        return unauthorized("Not authenticated")
    
    # Step 2: Call Cognito InitiateAuth with REFRESH_TOKEN_AUTH flow
    try:
        cognito_response = initiate_auth(
            auth_flow="REFRESH_TOKEN_AUTH",
            auth_parameters={
                "REFRESH_TOKEN": refresh_token,
            },
        )
    except CognitoError as e:
        audit_log_attempt(
            event_type="token_refresh",
            success=False,
            error_code=e.code,
            request_id=request_id,
        )
        # Most refresh failures = invalid/expired/revoked refresh token = re-login required
        return unauthorized("Session expired - please log in again")
    except Exception as e:
        logger.exception("Unexpected error in auth-refresh")
        audit_log_attempt(
            event_type="token_refresh",
            success=False,
            error_code="INTERNAL_ERROR",
            request_id=request_id,
            extra={"exception_type": type(e).__name__},
        )
        return internal_error()
    
    # Step 3: Extract new tokens
    auth_result = cognito_response.get("AuthenticationResult")
    if not auth_result:
        logger.error("Refresh response missing AuthenticationResult")
        return internal_error("Token refresh failed")
    
    new_access_token = auth_result.get("AccessToken")
    new_id_token = auth_result.get("IdToken")
    
    if not new_access_token or not new_id_token:
        logger.error("Refresh response incomplete")
        return internal_error("Token refresh failed")
    
    # Step 4: Verify the new access token (defense in depth)
    try:
        claims = verify_access_token(new_access_token)
        user_info = extract_user_info(claims)
    except JWTVerificationError as e:
        logger.error("Failed to verify new access token: %s", e)
        return internal_error("Token verification failed")
    
    # Step 5: Generate new CSRF token + build cookies
    new_csrf_token = secrets.token_urlsafe(32)
    
    # Only update access token + CSRF cookies; refresh token stays the same
    cookies_to_set = [
        build_access_token_cookie(new_access_token),
        build_csrf_cookie(new_csrf_token),
    ]
    
    # Step 6: Audit log success
    audit_log_attempt(
        event_type="token_refresh",
        username=user_info.get("username"),
        success=True,
        request_id=request_id,
        extra={"user_id": user_info.get("user_id")},
    )
    
    return success(
        data={
            "status": "refreshed",
            "user": user_info,
        },
        cookies=cookies_to_set,
    )

# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
