"""
BIS3 Defense - auth-me Lambda

Returns the currently authenticated user's information.
Validates the access token from the httpOnly cookie via JWT verification.
Does NOT call Cognito - purely validates the JWT signature against JWKS.

This is the most-called Lambda in the auth flow (frontend hits it on every
page load to check session validity).

Federal compliance:
    AC-3    Access Enforcement - JWT verification before returning user data
    AU-2    Audit Events - failed verifications logged
    IA-2    Identification and Authentication
    SC-13   Cryptographic Protection - RS256 signature verification
"""

import logging
import sys

sys.path.insert(0, "/var/task")

from cookies import parse_cookies, ACCESS_TOKEN_COOKIE
from jwt_verifier import (
    verify_access_token,
    extract_user_info,
    JWTVerificationError,
)
from responses import success, unauthorized


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """
    GET /auth/me
    
    Reads access token from cookies, verifies it, returns user info.
    
    Response (authenticated):
        {
            "user": {
                "user_id": "...",
                "username": "...",
                "email": "...",
                "groups": [...],
                "role": "...",
                "tenant_id": "..."
            }
        }
    
    Response (not authenticated):
        401 Unauthorized
    """
    # Step 1: Extract access token from cookies
    cookies = parse_cookies(event)
    access_token = cookies.get(ACCESS_TOKEN_COOKIE)
    
    if not access_token:
        return unauthorized("Not authenticated")
    
    # Step 2: Verify JWT signature + expiration + claims
    try:
        claims = verify_access_token(access_token)
    except JWTVerificationError as e:
        # Log specific verification failure for security monitoring
        logger.info("JWT verification failed: %s", str(e))
        return unauthorized("Session expired or invalid")
    
    # Step 3: Extract safe user info from claims
    user_info = extract_user_info(claims)
    
    return success({"user": user_info})
