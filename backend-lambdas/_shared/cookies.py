"""
BIS3 Defense - Auth API Cookie Builders

Builds Set-Cookie header values with federal-grade security attributes.
All cookies are httpOnly + Secure + SameSite=Strict + scoped to the API domain.

Federal compliance:
    AC-12  Session Termination - explicit Max-Age + clear cookies
    SC-8   Transmission Confidentiality - Secure flag forces HTTPS
    SC-23  Session Authenticity - SameSite=Strict prevents CSRF
    AC-3   Access Enforcement - httpOnly prevents JS access (XSS hardening)
"""

from typing import Optional


# Cookie domain - locked to API subdomain only per federal best practice.
# This means the frontend MUST use credentials: 'include' in fetch calls.
COOKIE_DOMAIN = "api.staging.app.bis3ai.com"

# Cookie names
ACCESS_TOKEN_COOKIE = "bis3_access"
REFRESH_TOKEN_COOKIE = "bis3_refresh"
CSRF_COOKIE = "bis3_csrf"

# Token lifetimes (matches Cognito user pool config)
ACCESS_TOKEN_MAX_AGE = 60 * 60         # 1 hour
REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30  # 30 days
CSRF_TOKEN_MAX_AGE = ACCESS_TOKEN_MAX_AGE  # tied to access token lifetime


def build_cookie(
    name: str,
    value: str,
    *,
    max_age: int,
    http_only: bool = True,
    secure: bool = True,
    same_site: str = "Strict",
    path: str = "/",
) -> str:
    """
    Build a Set-Cookie header value with secure defaults.

    Args:
        name: cookie name
        value: cookie value (already URL-encoded if needed)
        max_age: lifetime in seconds (0 to expire immediately)
        http_only: prevents JS access (default True - federal requirement for auth)
        secure: only sent over HTTPS (default True - federal requirement)
        same_site: CSRF protection level ("Strict", "Lax", "None")
        path: URL path scope

    Returns:
        Set-Cookie header value string
    """
    parts = [f"{name}={value}"]
    parts.append(f"Domain={COOKIE_DOMAIN}")
    parts.append(f"Path={path}")
    parts.append(f"Max-Age={max_age}")
    parts.append(f"SameSite={same_site}")

    if secure:
        parts.append("Secure")
    if http_only:
        parts.append("HttpOnly")

    return "; ".join(parts)


def build_access_token_cookie(token: str) -> str:
    """Build Set-Cookie for the access token (httpOnly, 1h)."""
    return build_cookie(
        ACCESS_TOKEN_COOKIE,
        token,
        max_age=ACCESS_TOKEN_MAX_AGE,
    )


def build_refresh_token_cookie(token: str) -> str:
    """Build Set-Cookie for the refresh token (httpOnly, 30d)."""
    return build_cookie(
        REFRESH_TOKEN_COOKIE,
        token,
        max_age=REFRESH_TOKEN_MAX_AGE,
    )


def build_csrf_cookie(csrf_token: str) -> str:
    """
    Build Set-Cookie for CSRF token (NOT httpOnly so JS can read + send in header).

    Pattern: double-submit cookie. JS reads this and sends the value in
    X-CSRF-Token header on state-changing requests. Server validates that
    the cookie value matches the header value. Different from session token
    because attacker on another origin can't read this cookie due to SameSite=Strict.
    """
    return build_cookie(
        CSRF_COOKIE,
        csrf_token,
        max_age=CSRF_TOKEN_MAX_AGE,
        http_only=False,  # JS needs to read this
    )


def build_session_cookies(
    access_token: str,
    refresh_token: str,
    csrf_token: str,
) -> list[str]:
    """
    Build all 3 session cookies as a list (for multiValueHeaders).

    Returns list of Set-Cookie values to be returned in API Gateway response.
    """
    return [
        build_access_token_cookie(access_token),
        build_refresh_token_cookie(refresh_token),
        build_csrf_cookie(csrf_token),
    ]


def clear_session_cookies() -> list[str]:
    """
    Build cookies that immediately expire (for logout).

    Sets Max-Age=0 on all session cookies, which tells the browser to
    delete them. Combined with refresh token revocation server-side, this
    fully terminates the session.
    """
    return [
        build_cookie(ACCESS_TOKEN_COOKIE, "", max_age=0),
        build_cookie(REFRESH_TOKEN_COOKIE, "", max_age=0),
        build_cookie(CSRF_COOKIE, "", max_age=0, http_only=False),
    ]


def parse_cookies(event: dict) -> dict[str, str]:
    """
    Parse cookies from API Gateway event into a dict.

    REST API Gateway sends cookies in:
    - event['headers']['Cookie'] (single string with all cookies, comma- or semicolon-separated)
    - event['multiValueHeaders']['cookie'] (list of cookie strings, each may have multiple cookies)

    Args:
        event: API Gateway proxy event

    Returns:
        dict mapping cookie name to value
    """
    cookies: dict[str, str] = {}

    # Try multiValueHeaders first (list of cookie header strings)
    multi_value = event.get("multiValueHeaders") or {}
    cookie_header_list: list[str] = []

    # Headers are case-insensitive in HTTP - handle both "cookie" and "Cookie"
    for key in ("Cookie", "cookie"):
        if key in multi_value:
            cookie_header_list.extend(multi_value[key])
            break

    # Fall back to single-value headers
    if not cookie_header_list:
        headers = event.get("headers") or {}
        for key in ("Cookie", "cookie"):
            if key in headers and headers[key]:
                cookie_header_list.append(headers[key])
                break

    # Parse each cookie header string
    for cookie_str in cookie_header_list:
        for pair in cookie_str.split(";"):
            pair = pair.strip()
            if "=" in pair:
                name, _, value = pair.partition("=")
                cookies[name.strip()] = value.strip()

    return cookies
