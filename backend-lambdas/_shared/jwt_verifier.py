"""
BIS3 Defense - JWT Verification

Verifies Cognito-issued JWT tokens by validating:
1. Signature using Cognito's public JWKS (JSON Web Key Set)
2. Issuer (iss claim) matches our user pool
3. Audience (aud or client_id claim) matches our app client
4. Expiration (exp claim) hasn't passed
5. Token use (token_use claim) is the expected type ('access' or 'id')

CRITICAL SECURITY NOTES:
- JWKS is fetched from Cognito on Lambda cold start and cached for the Lambda lifetime
- The 'kid' (key ID) in the JWT header tells us which JWKS key to use
- Cognito rotates signing keys; if we see a kid we don't have, we re-fetch JWKS
- We use python-jose library because cryptography vetting is well-established

Federal compliance:
    IA-2     Identification and Authentication - JWT IS the auth mechanism
    IA-2(8)  Replay-resistant Authentication - exp claim prevents replay
    IA-5     Authenticator Management - rotation via Cognito JWKS rotation
    SC-12    Cryptographic Key Management - asymmetric keys via Cognito
    SC-13    Cryptographic Protection - RS256 signature
    SC-23    Session Authenticity - signed JWTs proving identity
    AU-2     Audit Events - failed verifications logged
"""

import json
import os
import time
from typing import Any, Optional
from urllib.request import urlopen
from urllib.error import URLError

# python-jose is the AWS-recommended JWT library for Python
# Available via Lambda's built-in runtime if installed via pip
from jose import jwt
from jose.exceptions import JWTError, JWKError, ExpiredSignatureError


# Cognito User Pool config (from environment variables set by Terraform)
USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "us-gov-west-1_0VaQnbcFH")
USER_POOL_CLIENT_ID = os.environ.get("COGNITO_USER_POOL_CLIENT_ID", "anrf7jlfgfevp7c6esu705p7k")
AWS_REGION = os.environ.get("AWS_REGION", "us-gov-west-1")

# Cognito issues tokens with this issuer URL
COGNITO_ISSUER = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{USER_POOL_ID}"

# JWKS URL (public keys to verify token signatures)
JWKS_URL = f"{COGNITO_ISSUER}/.well-known/jwks.json"

# Cache JWKS in module-level dict; Lambda invocations within same execution
# environment reuse this. Cleared on cold starts.
_jwks_cache: Optional[dict[str, Any]] = None
_jwks_fetch_time: float = 0


class JWTVerificationError(Exception):
    """Raised when JWT verification fails for any reason."""
    pass


def _fetch_jwks(force_refresh: bool = False) -> dict[str, Any]:
    """
    Fetch JWKS from Cognito and cache it.

    Args:
        force_refresh: bypass cache (used when we see an unknown kid)

    Returns:
        JWKS dict with 'keys' list

    Raises:
        JWTVerificationError: if JWKS fetch fails
    """
    global _jwks_cache, _jwks_fetch_time

    # Use cache if available and not forcing refresh
    if _jwks_cache is not None and not force_refresh:
        return _jwks_cache

    try:
        # 5-second timeout - Cognito JWKS is fast; if it's slow something is wrong
        with urlopen(JWKS_URL, timeout=5) as response:
            jwks_raw = response.read().decode("utf-8")
            _jwks_cache = json.loads(jwks_raw)
            _jwks_fetch_time = time.time()
            return _jwks_cache
    except (URLError, json.JSONDecodeError, OSError) as e:
        raise JWTVerificationError(f"Failed to fetch JWKS: {type(e).__name__}")


def _find_signing_key(kid: str, force_refresh: bool = False) -> dict[str, Any]:
    """
    Find the JWKS key matching the JWT's 'kid' header.

    Args:
        kid: Key ID from the JWT header
        force_refresh: bypass JWKS cache and fetch fresh keys

    Returns:
        JWKS key dict suitable for jose.jwk.construct()

    Raises:
        JWTVerificationError: if no matching key found even after refresh
    """
    jwks = _fetch_jwks(force_refresh=force_refresh)

    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key

    # If kid not in cached JWKS and we haven't already refreshed, try once more
    # (Cognito may have rotated keys since cache)
    if not force_refresh:
        return _find_signing_key(kid, force_refresh=True)

    raise JWTVerificationError(f"JWT signed with unknown key (kid={kid})")


def verify_token(
    token: str,
    *,
    expected_use: str = "access",
) -> dict[str, Any]:
    """
    Verify a Cognito JWT token and return its claims.

    Validates: signature, issuer, expiration, token_use, and (for access tokens)
    client_id.

    Args:
        token: the JWT string (e.g. from a cookie or Authorization header)
        expected_use: 'access' (for API auth) or 'id' (for identity claims)

    Returns:
        dict of token claims (sub, email, cognito:groups, custom:role, etc.)

    Raises:
        JWTVerificationError: if any verification step fails
    """
    if not token or not isinstance(token, str):
        raise JWTVerificationError("No token provided")

    # Step 1: Decode unverified header to get kid
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise JWTVerificationError(f"Malformed JWT header: {type(e).__name__}")

    kid = unverified_header.get("kid")
    if not kid:
        raise JWTVerificationError("JWT header missing 'kid'")

    # Step 2: Find the signing key from JWKS
    signing_key = _find_signing_key(kid)

    # Step 3: Verify signature + standard claims
    # python-jose handles signature verification, exp/nbf/iat checks
    try:
        # For access tokens: aud is NOT in the JWT (Cognito-specific behavior),
        # so we verify client_id manually below.
        # For id tokens: aud IS the client_id - verify directly via jwt.decode.
        decode_kwargs: dict[str, Any] = {
            "issuer": COGNITO_ISSUER,
            "options": {"verify_aud": False},  # Manual aud check after decode
        }

        # ID tokens have aud claim; access tokens have client_id claim
        if expected_use == "id":
            decode_kwargs["audience"] = USER_POOL_CLIENT_ID
            decode_kwargs["options"] = {"verify_aud": True}

        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            **decode_kwargs,
        )
    except ExpiredSignatureError:
        raise JWTVerificationError("Token expired")
    except (JWTError, JWKError) as e:
        raise JWTVerificationError(f"JWT verification failed: {type(e).__name__}")

    # Step 4: Verify token_use claim matches expected
    actual_use = claims.get("token_use")
    if actual_use != expected_use:
        raise JWTVerificationError(
            f"Wrong token type (expected '{expected_use}', got '{actual_use}')"
        )

    # Step 5: For access tokens, verify client_id
    if expected_use == "access":
        actual_client_id = claims.get("client_id")
        if actual_client_id != USER_POOL_CLIENT_ID:
            raise JWTVerificationError("Token issued for different client")

    return claims


def verify_access_token(token: str) -> dict[str, Any]:
    """Convenience wrapper for verifying an access token."""
    return verify_token(token, expected_use="access")


def verify_id_token(token: str) -> dict[str, Any]:
    """Convenience wrapper for verifying an id token."""
    return verify_token(token, expected_use="id")


def extract_user_info(claims: dict[str, Any]) -> dict[str, Any]:
    """
    Extract user-relevant claims from verified JWT for response payloads.

    Returns only safe-to-expose user info; never includes raw token data.
    """
    return {
        "user_id": claims.get("sub"),
        "username": claims.get("username") or claims.get("cognito:username"),
        "email": claims.get("email"),
        "groups": claims.get("cognito:groups", []),
        "role": claims.get("custom:role"),
        "tenant_id": claims.get("custom:tenant_id"),
    }
