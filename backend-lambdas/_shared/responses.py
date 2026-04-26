"""
BIS3 Defense - Auth API Response Builders

Provides standardized response builders for API Gateway proxy integration.
All responses include federally-required security headers by default.

Federal compliance:
    AU-3   Content of Audit Records - structured response codes for log analysis
    SC-8   Transmission Confidentiality - HSTS forces HTTPS
    SC-13  Cryptographic Protection - HSTS+TLS only
    SI-10  Information Input Validation - explicit content type validation
"""

import json
from typing import Any, Optional


# Security headers applied to ALL API responses by default.
# These are NIST 800-53 SC-8 (Transmission Confidentiality) and
# OWASP-recommended baseline headers.
_DEFAULT_SECURITY_HEADERS = {
    "Content-Type": "application/json",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
    # CSP: deny everything by default. Each Lambda can override if needed.
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    # CORS: required for browser-based clients. The API requires Bearer
    # tokens for auth so wide-open Allow-Origin is acceptable security-wise.
    # Tighten to an allowlist when prod domains are stable.
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}


def _build_response(
    status_code: int,
    body: dict[str, Any],
    *,
    extra_headers: Optional[dict[str, str]] = None,
    cookies: Optional[list[str]] = None,
) -> dict[str, Any]:
    """
    Internal response builder. All public response functions wrap this.

    Args:
        status_code: HTTP status (200, 400, 401, etc.)
        body: dict to JSON-serialize as response body
        extra_headers: additional headers (merged with security defaults)
        cookies: list of fully-formed Set-Cookie header values (already including all attributes)

    Returns:
        API Gateway proxy response dict
    """
    headers = dict(_DEFAULT_SECURITY_HEADERS)
    if extra_headers:
        headers.update(extra_headers)

    response = {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, default=str),
    }

    # API Gateway REST API supports multiValueHeaders for multiple Set-Cookie
    if cookies:
        response["multiValueHeaders"] = {
            **{k: [v] for k, v in headers.items()},
            "Set-Cookie": cookies,
        }
        # Remove single-value headers when using multiValueHeaders
        del response["headers"]

    return response


def success(
    data: Optional[dict[str, Any]] = None,
    *,
    cookies: Optional[list[str]] = None,
    status_code: int = 200,
) -> dict[str, Any]:
    """
    Build a successful response (200 by default).

    Args:
        data: response body data (defaults to {"status": "ok"})
        cookies: optional list of Set-Cookie header values
        status_code: HTTP status (200, 201, 204)
    """
    body = data if data is not None else {"status": "ok"}
    return _build_response(status_code, body, cookies=cookies)


def error(
    message: str,
    *,
    status_code: int = 400,
    error_code: Optional[str] = None,
    extra_headers: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    """
    Build an error response.

    IMPORTANT - SECURITY: Error messages MUST NOT leak internal details
    (stack traces, database errors, AWS resource IDs, etc.). Use
    user-safe messages here. Log detailed errors separately to CloudWatch
    using the audit_log() function.

    Args:
        message: user-safe error description
        status_code: HTTP status (400, 401, 403, 404, 429, 500)
        error_code: optional machine-readable error code (e.g. "INVALID_CREDENTIALS")
        extra_headers: e.g. WWW-Authenticate for 401
    """
    body = {"error": message}
    if error_code:
        body["code"] = error_code
    return _build_response(status_code, body, extra_headers=extra_headers)


# Common error responses with predefined messages (DRY)
def unauthorized(message: str = "Authentication required") -> dict[str, Any]:
    """401 Unauthorized."""
    return error(message, status_code=401, error_code="UNAUTHORIZED")


def forbidden(message: str = "Access denied") -> dict[str, Any]:
    """403 Forbidden."""
    return error(message, status_code=403, error_code="FORBIDDEN")


def bad_request(message: str = "Invalid request", error_code: Optional[str] = None) -> dict[str, Any]:
    """400 Bad Request."""
    return error(message, status_code=400, error_code=error_code or "BAD_REQUEST")


def too_many_requests(message: str = "Too many requests") -> dict[str, Any]:
    """429 Too Many Requests."""
    return error(message, status_code=429, error_code="RATE_LIMITED")


def internal_error(message: str = "An internal error occurred") -> dict[str, Any]:
    """
    500 Internal Server Error.

    SECURITY: Use this for unexpected exceptions. NEVER include the actual
    exception details in the response - log them separately and return a
    generic message to the client.
    """
    return error(message, status_code=500, error_code="INTERNAL_ERROR")

