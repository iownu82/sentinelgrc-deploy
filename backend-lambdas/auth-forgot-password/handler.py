"""
BIS3 Defense - auth-forgot-password Lambda

Initiates the password reset flow. Cognito sends a verification code via SES
to the email associated with the username.

CRITICAL FEDERAL REQUIREMENT (IA-6 - Authenticator Feedback):
  This endpoint ALWAYS returns 200 with a generic message regardless of
  whether the user exists. This prevents user enumeration attacks where an
  attacker could discover valid usernames by observing different responses.

Federal compliance:
    AC-3    Access Enforcement
    AU-2    Audit Events (every reset request logged)
    AU-3    Content of Audit Records
    IA-5    Authenticator Management (password lifecycle)
    IA-6    Authenticator Feedback (no enumeration)
    SC-13   Cryptographic Protection (code is cryptographically random)
"""

import base64
import json
import logging
import sys

sys.path.insert(0, "/var/task")

from cognito_client import (
    forgot_password,
    audit_log_attempt,
    CognitoError,
)
from responses import (
    success,
    bad_request,
    too_many_requests,
    internal_error,
)


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/forgot-password

    Request body:
        {
            "email": "user@example.com"
        }

    Response (always 200, regardless of whether user exists):
        {
            "status": "code_sent",
            "message": "If an account exists for this email, a code has been sent."
        }
    """
    request_id = context.aws_request_id if context else "no-context"

    # Step 1: Parse and validate request body
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

    # Step 2: Initiate forgot-password flow
    try:
        forgot_password(username=email)
        audit_log_attempt(
            event_type="password_reset_requested",
            username=email,
            success=True,
            request_id=request_id,
        )
    except CognitoError as e:
        # IA-6: Do NOT differentiate user-not-found from success.
        # Log internally for security monitoring, but return generic 200.
        if e.code == "RATE_LIMITED":
            audit_log_attempt(
                event_type="password_reset_requested",
                username=email,
                success=False,
                error_code="RATE_LIMITED",
                request_id=request_id,
            )
            return too_many_requests(
                "Too many password reset attempts. Please try again later."
            )
        # All other errors (including USER_NOT_FOUND, INVALID_EMAIL, etc.)
        # are logged internally but return generic success to caller.
        audit_log_attempt(
            event_type="password_reset_requested",
            username=email,
            success=False,
            error_code=e.code,
            request_id=request_id,
            extra={"internal_error": str(e)},
        )
    except Exception as e:
        logger.exception("Unexpected error in forgot-password")
        audit_log_attempt(
            event_type="password_reset_requested",
            username=email,
            success=False,
            error_code="INTERNAL_ERROR",
            request_id=request_id,
            extra={"exception_type": type(e).__name__},
        )
        # Even on internal errors, return generic 200 to prevent timing
        # side-channel that could distinguish "user exists" from errors.

    # Step 3: Always return generic success message (IA-6 enumeration prevention)
    return success({
        "status": "code_sent",
        "message": "If an account exists for this email, a verification code has been sent.",
    })


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
