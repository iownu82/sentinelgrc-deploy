"""
BIS3 Defense - auth-logout Lambda

Logs out a user by:
1. Reading refresh token from httpOnly cookie
2. Calling Cognito RevokeToken to invalidate it server-side
3. Clearing all session cookies in the response

After logout:
- Refresh token cannot be used for new access tokens (server-side invalidated)
- Browser deletes the cookies (Max-Age=0)
- Existing access token remains valid until natural expiry (1h max)

For full immediate revocation (e.g. on credential compromise) use
admin-force-password-reset instead.

Federal compliance:
    AC-12   Session Termination - cookies cleared + refresh token revoked
    AU-2    Audit Events - logout logged
    AU-3    Content of Audit Records
"""

import logging
import sys

sys.path.insert(0, "/var/task")

from cognito_client import (
    revoke_token,
    audit_log_attempt,
    CognitoError,
)
from cookies import (
    parse_cookies,
    clear_session_cookies,
    REFRESH_TOKEN_COOKIE,
)
from responses import success


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/logout
    
    No request body required (uses cookies for auth).
    
    Response:
        { "status": "logged_out" }
        + Set-Cookie headers that immediately expire all session cookies
    
    SECURITY: Always returns success even if refresh token revocation fails.
    The cookies are cleared regardless, so the browser session is terminated.
    Failed revocation is logged for security monitoring but doesn't block logout.
    """
    request_id = context.aws_request_id if context else "no-context"
    
    # Step 1: Extract refresh token from cookies
    cookies = parse_cookies(event)
    refresh_token = cookies.get(REFRESH_TOKEN_COOKIE)
    
    # Step 2: Try to revoke refresh token server-side (best effort)
    revocation_status = "skipped"
    if refresh_token:
        try:
            revoke_token(refresh_token)
            revocation_status = "success"
        except CognitoError as e:
            # Log but don't fail logout - cookies will still be cleared
            logger.warning(
                "Failed to revoke refresh token during logout: %s (code=%s)",
                str(e), e.code,
            )
            revocation_status = f"failed_{e.code}"
        except Exception as e:
            logger.exception("Unexpected error revoking refresh token")
            revocation_status = f"failed_{type(e).__name__}"
    
    # Step 3: Audit log
    audit_log_attempt(
        event_type="logout",
        success=True,
        request_id=request_id,
        extra={"revocation_status": revocation_status},
    )
    
    # Step 4: Return success with cookies cleared (Max-Age=0)
    return success(
        data={"status": "logged_out"},
        cookies=clear_session_cookies(),
    )
