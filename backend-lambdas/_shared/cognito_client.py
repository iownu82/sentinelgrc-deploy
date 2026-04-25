"""
BIS3 Defense - Cognito Client Wrapper

Thin wrapper around boto3 Cognito IDP client for the operations our auth
Lambdas need. Centralizes Cognito calls so the Lambda handlers can focus
on request/response handling.

Federal compliance:
    AC-3     Access Enforcement - all Cognito calls scoped to user pool
    AU-2     Audit Events - Cognito logs all auth attempts to CloudTrail
    IA-2     Identification and Authentication - Cognito IS the auth provider
    IA-2(1)  MFA for privileged accounts (enforced in Cognito user pool config)
    IA-5     Authenticator Management - via Cognito password policy
"""

import os
from typing import Any, Optional

import boto3
from botocore.exceptions import ClientError


# Cognito config (Terraform sets these env vars)
USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "us-gov-west-1_0VaQnbcFH")
USER_POOL_CLIENT_ID = os.environ.get("COGNITO_USER_POOL_CLIENT_ID", "anrf7jlfgfevp7c6esu705p7k")
AWS_REGION = os.environ.get("AWS_REGION", "us-gov-west-1")


# Module-level boto3 client. boto3 caches connections across Lambda invocations
# in the same execution environment, so this is reused for warm starts.
_cognito_client = None


def _get_client():
    """Lazy-init the boto3 client (deferred until first call)."""
    global _cognito_client
    if _cognito_client is None:
        _cognito_client = boto3.client("cognito-idp", region_name=AWS_REGION)
    return _cognito_client


class CognitoError(Exception):
    """Raised when a Cognito operation fails."""

    def __init__(self, message: str, *, code: str = "COGNITO_ERROR"):
        super().__init__(message)
        self.code = code


# Map Cognito error codes to user-safe messages.
# CRITICAL: Never expose raw Cognito errors to end users -
# they reveal internal pool configuration and aid enumeration.
_USER_SAFE_ERROR_MESSAGES = {
    "NotAuthorizedException": ("Invalid email or password", "INVALID_CREDENTIALS"),
    "UserNotFoundException": ("Invalid email or password", "INVALID_CREDENTIALS"),
    "PasswordResetRequiredException": ("Password reset required", "PASSWORD_RESET_REQUIRED"),
    "UserNotConfirmedException": ("Account not yet activated", "ACCOUNT_NOT_CONFIRMED"),
    "TooManyRequestsException": ("Too many requests, please wait", "RATE_LIMITED"),
    "TooManyFailedAttemptsException": ("Too many failed attempts, account locked", "ACCOUNT_LOCKED"),
    "InvalidPasswordException": ("Password does not meet requirements", "WEAK_PASSWORD"),
    "CodeMismatchException": ("Invalid MFA code", "INVALID_MFA"),
    "ExpiredCodeException": ("MFA code expired, please retry", "EXPIRED_MFA"),
    "InvalidParameterException": ("Invalid request format", "INVALID_REQUEST"),
    "ResourceNotFoundException": ("Service unavailable", "SERVICE_UNAVAILABLE"),
}


def _translate_error(client_error: ClientError) -> CognitoError:
    """Translate a boto3 ClientError into a user-safe CognitoError."""
    error_code = client_error.response.get("Error", {}).get("Code", "Unknown")
    safe_message, safe_code = _USER_SAFE_ERROR_MESSAGES.get(
        error_code,
        ("Authentication failed", "AUTH_FAILED"),
    )
    return CognitoError(safe_message, code=safe_code)


# ============================================================================
# AUTHENTICATION OPERATIONS
# ============================================================================

def initiate_auth(auth_flow: str, auth_parameters: dict[str, str]) -> dict[str, Any]:
    """
    Initiate a Cognito authentication flow.

    Args:
        auth_flow: Cognito auth flow type:
            - "USER_SRP_AUTH" - SRP login (federal preferred)
            - "REFRESH_TOKEN_AUTH" - refresh tokens via refresh token
            - "USER_PASSWORD_AUTH" - plain password (avoided in our build)
        auth_parameters: flow-specific params (USERNAME, SRP_A, REFRESH_TOKEN, etc.)

    Returns:
        Cognito InitiateAuth response dict (may contain ChallengeName + Session
        for SRP/MFA flows, or AuthenticationResult tokens for completed auth)

    Raises:
        CognitoError: with user-safe message
    """
    try:
        return _get_client().initiate_auth(
            AuthFlow=auth_flow,
            AuthParameters=auth_parameters,
            ClientId=USER_POOL_CLIENT_ID,
        )
    except ClientError as e:
        raise _translate_error(e)


def respond_to_auth_challenge(
    challenge_name: str,
    session: str,
    challenge_responses: dict[str, str],
) -> dict[str, Any]:
    """
    Respond to a Cognito auth challenge (e.g., MFA, NEW_PASSWORD_REQUIRED).

    Args:
        challenge_name: e.g. "SOFTWARE_TOKEN_MFA", "PASSWORD_VERIFIER", "NEW_PASSWORD_REQUIRED"
        session: opaque session token from previous initiate_auth response
        challenge_responses: e.g. {"USERNAME": "...", "SOFTWARE_TOKEN_MFA_CODE": "123456"}

    Returns:
        Cognito RespondToAuthChallenge response (AuthenticationResult on success
        or another ChallengeName for chained challenges)

    Raises:
        CognitoError: with user-safe message
    """
    try:
        return _get_client().respond_to_auth_challenge(
            ClientId=USER_POOL_CLIENT_ID,
            ChallengeName=challenge_name,
            Session=session,
            ChallengeResponses=challenge_responses,
        )
    except ClientError as e:
        raise _translate_error(e)


def revoke_token(refresh_token: str) -> None:
    """
    Revoke a refresh token (server-side logout).

    After revocation, the refresh token cannot be used to get new access tokens.
    Existing access tokens remain valid until their natural expiration (1 hour).
    For full immediate revocation, would need a token blocklist - not implemented
    at this stage.

    Args:
        refresh_token: the refresh token to revoke

    Raises:
        CognitoError: if revocation fails
    """
    try:
        _get_client().revoke_token(
            Token=refresh_token,
            ClientId=USER_POOL_CLIENT_ID,
        )
    except ClientError as e:
        raise _translate_error(e)


def global_sign_out(access_token: str) -> None:
    """
    Sign out a user from ALL devices (revokes all their refresh tokens).

    Args:
        access_token: the user's current access token

    Raises:
        CognitoError: if sign-out fails
    """
    try:
        _get_client().global_sign_out(AccessToken=access_token)
    except ClientError as e:
        raise _translate_error(e)


# ============================================================================
# AUDIT LOGGING HELPER
# ============================================================================

def audit_log_attempt(
    *,
    event_type: str,
    username: Optional[str] = None,
    success: bool,
    error_code: Optional[str] = None,
    request_id: Optional[str] = None,
    extra: Optional[dict[str, Any]] = None,
) -> None:
    """
    Emit a structured audit log line for security event analysis.

    Logs go to the Lambda's CloudWatch log group (KMS-encrypted, 365-day retention).
    Format is structured JSON for easy parsing in CloudWatch Insights queries.

    Federal compliance:
        AU-2 Audit Events
        AU-3 Content of Audit Records
    """
    import json
    from datetime import datetime, timezone

    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "audit_event": event_type,
        "success": success,
    }

    if username:
        log_entry["username"] = username
    if error_code:
        log_entry["error_code"] = error_code
    if request_id:
        log_entry["request_id"] = request_id
    if extra:
        log_entry.update(extra)

    # Print to stdout - Lambda forwards stdout to CloudWatch automatically
    print(json.dumps(log_entry, default=str))
