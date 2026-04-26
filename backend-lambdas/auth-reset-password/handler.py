"""
BIS3 Defense - auth-reset-password Lambda

Completes the password reset flow by verifying the code Cognito emailed
and setting the new password.

Federal compliance:
    AC-3    Access Enforcement
    AU-2    Audit Events
    AU-3    Content of Audit Records
    IA-5    Authenticator Management (password lifecycle)
    IA-5(1) Password Complexity (validated against Cognito policy)
    SC-13   Cryptographic Protection
"""

import base64
import json
import logging
import sys

sys.path.insert(0, "/var/task")

from cognito_client import (
    confirm_forgot_password,
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


# Password policy enforced before sending to Cognito (defense in depth)
# Cognito will also enforce its own policy server-side
MIN_PASSWORD_LENGTH = 15
MAX_PASSWORD_LENGTH = 256


def _validate_password_complexity(password: str) -> tuple[bool, str]:
    """
    Validate password meets the same complexity rules as the Cognito User Pool:
    - 15+ chars
    - Must contain at least 4 of: uppercase, lowercase, digit, symbol

    Returns (valid, error_message).
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
    if len(password) > MAX_PASSWORD_LENGTH:
        return False, f"Password must be {MAX_PASSWORD_LENGTH} characters or fewer"

    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_symbol = any(not c.isalnum() for c in password)

    classes_present = sum([has_upper, has_lower, has_digit, has_symbol])
    if classes_present < 4:
        return False, (
            "Password must contain uppercase, lowercase, digit, and symbol characters"
        )

    return True, ""


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/reset-password

    Request body:
        {
            "email": "user@example.com",
            "confirmationCode": "123456",
            "newPassword": "<at least 15 chars, 4 character classes>"
        }

    Response (success):
        {
            "status": "password_reset",
            "message": "Password successfully reset. You can now log in."
        }

    Errors:
        400 INVALID_CODE        - code is wrong or doesn't match user
        400 EXPIRED_CODE        - code has expired (Cognito default: 1 hour)
        400 WEAK_PASSWORD       - password fails complexity check
        429 RATE_LIMITED        - too many attempts
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
    confirmation_code = body.get("confirmationCode")
    new_password = body.get("newPassword")

    # Validate required fields
    if not email or not isinstance(email, str):
        return bad_request("Email is required", error_code="MISSING_EMAIL")
    if not confirmation_code or not isinstance(confirmation_code, str):
        return bad_request(
            "Confirmation code is required",
            error_code="MISSING_CODE",
        )
    if not new_password or not isinstance(new_password, str):
        return bad_request(
            "New password is required",
            error_code="MISSING_PASSWORD",
        )

    # Format checks
    if len(email) > 256 or "@" not in email:
        return bad_request("Invalid email format", error_code="INVALID_EMAIL")
    if not confirmation_code.isdigit() or len(confirmation_code) != 6:
        return bad_request(
            "Confirmation code must be 6 digits",
            error_code="INVALID_CODE_FORMAT",
        )

    # Step 2: Pre-validate password complexity (catches obvious failures
    # before sending to Cognito - faster feedback for users)
    valid, password_error = _validate_password_complexity(new_password)
    if not valid:
        audit_log_attempt(
            event_type="password_reset_completed",
            username=email,
            success=False,
            error_code="WEAK_PASSWORD",
            request_id=request_id,
        )
        return bad_request(password_error, error_code="WEAK_PASSWORD")

    # Step 3: Send to Cognito
    try:
        confirm_forgot_password(
            username=email,
            confirmation_code=confirmation_code,
            new_password=new_password,
        )
    except CognitoError as e:
        audit_log_attempt(
            event_type="password_reset_completed",
            username=email,
            success=False,
            error_code=e.code,
            request_id=request_id,
        )
        if e.code == "RATE_LIMITED":
            return too_many_requests(str(e))
        if e.code in ("INVALID_CODE", "EXPIRED_CODE"):
            # Don't reveal which - generic to prevent timing oracle
            return bad_request(
                "Invalid or expired verification code",
                error_code="INVALID_CODE",
            )
        if e.code == "WEAK_PASSWORD":
            # Cognito's server-side policy caught what our pre-check missed
            return bad_request(
                "Password does not meet complexity requirements",
                error_code="WEAK_PASSWORD",
            )
        return bad_request(str(e), error_code=e.code)
    except Exception as e:
        logger.exception("Unexpected error in reset-password")
        audit_log_attempt(
            event_type="password_reset_completed",
            username=email,
            success=False,
            error_code="INTERNAL_ERROR",
            request_id=request_id,
            extra={"exception_type": type(e).__name__},
        )
        return internal_error()

    # Step 4: Success
    audit_log_attempt(
        event_type="password_reset_completed",
        username=email,
        success=True,
        request_id=request_id,
    )

    return success({
        "status": "password_reset",
        "message": "Password successfully reset. You can now log in.",
    })


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
