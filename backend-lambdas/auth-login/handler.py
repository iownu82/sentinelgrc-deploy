"""
BIS3 Defense - auth-login Lambda

Step 1 of the SRP authentication flow.
Receives: {"email": "...", "srpA": "..."}
Calls Cognito: InitiateAuth(USER_SRP_AUTH)
Returns: SRP challenge data for client to compute password verifier signature

The actual password verification happens in auth-verify-srp Lambda.
This Lambda NEVER sees the user's password - true client-side SRP per
DoD CC SRG IL5 5.10.1.1 + FedRAMP High SC-13(1) directive.

Federal compliance:
    AC-7    Unsuccessful Logon Attempts (WAF rate limit + Cognito lockout)
    AU-2    Audit Events (every attempt logged via audit_log_attempt)
    AU-3    Content of Audit Records
    IA-2    Identification and Authentication
    IA-2(8) Replay-resistant Authentication (SRP nonces prevent replay)
    SC-8    Transmission Confidentiality (TLS 1.2+ enforced)
    SC-13   Cryptographic Protection (SRP uses RFC 5054 / 2945)
    SC-23   Session Authenticity
"""

import json
import logging
import sys

# Add /var/task to path for _shared modules
# (CI/CD copies _shared/*.py into the deployment package root)
sys.path.insert(0, "/var/task")

from cognito_client import (
    initiate_auth,
    audit_log_attempt,
    CognitoError,
)
from responses import (
    success,
    bad_request,
    unauthorized,
    too_many_requests,
    internal_error,
)


# Configure standard Python logging (Lambda forwards to CloudWatch)
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/login
    
    Request body:
        {
            "email": "user@example.com",
            "srpA": "<hex-encoded SRP_A value computed by client>"
        }
    
    Response (success):
        {
            "challenge": "PASSWORD_VERIFIER",
            "session": "<opaque session token>",
            "challengeParameters": {
                "USER_ID_FOR_SRP": "<cognito sub>",
                "SALT": "<hex>",
                "SECRET_BLOCK": "<base64>",
                "SRP_B": "<hex>"
            }
        }
    
    Client uses challengeParameters + password to compute PASSWORD_CLAIM_SIGNATURE,
    then calls POST /auth/verify-srp with the signature.
    """
    request_id = context.aws_request_id if context else "no-context"
    
    # Step 1: Parse and validate request body
    try:
        body_raw = event.get("body") or "{}"
        # API Gateway may base64-encode bodies; check isBase64Encoded
        if event.get("isBase64Encoded"):
            import base64
            body_raw = base64.b64decode(body_raw).decode("utf-8")
        body = json.loads(body_raw)
    except (json.JSONDecodeError, ValueError, UnicodeDecodeError):
        audit_log_attempt(
            event_type="login_initiate",
            success=False,
            error_code="MALFORMED_BODY",
            request_id=request_id,
        )
        return bad_request("Invalid request body", error_code="MALFORMED_BODY")
    
    email = body.get("email")
    srp_a = body.get("srpA")
    
    if not email or not isinstance(email, str):
        return bad_request("Email is required", error_code="MISSING_EMAIL")
    if not srp_a or not isinstance(srp_a, str):
        return bad_request("SRP_A value is required", error_code="MISSING_SRP_A")
    
    # Email length sanity check (prevent DoS via huge inputs)
    if len(email) > 254:  # RFC 5321 max email length
        return bad_request("Email too long", error_code="INVALID_EMAIL")
    if len(srp_a) > 4096:  # SRP_A is typically ~512 hex chars; 4096 is generous
        return bad_request("SRP_A value too long", error_code="INVALID_SRP_A")
    
    # Step 2: Call Cognito InitiateAuth with USER_SRP_AUTH flow
    try:
        cognito_response = initiate_auth(
            auth_flow="USER_SRP_AUTH",
            auth_parameters={
                "USERNAME": email,
                "SRP_A": srp_a,
            },
        )
    except CognitoError as e:
        # User-safe error message already in CognitoError
        audit_log_attempt(
            event_type="login_initiate",
            username=email,
            success=False,
            error_code=e.code,
            request_id=request_id,
        )
        # Map specific error codes to HTTP statuses
        if e.code == "RATE_LIMITED":
            return too_many_requests(str(e))
        if e.code in ("INVALID_CREDENTIALS", "ACCOUNT_LOCKED"):
            return unauthorized(str(e))
        return bad_request(str(e), error_code=e.code)
    except Exception as e:
        # Unexpected exception - log details, return generic error
        logger.exception("Unexpected error in auth-login")
        audit_log_attempt(
            event_type="login_initiate",
            username=email,
            success=False,
            error_code="INTERNAL_ERROR",
            request_id=request_id,
            extra={"exception_type": type(e).__name__},
        )
        return internal_error()
    
    # Step 3: Extract challenge data from Cognito response
    challenge_name = cognito_response.get("ChallengeName")
    
    # USER_SRP_AUTH should always return PASSWORD_VERIFIER challenge first
    if challenge_name != "PASSWORD_VERIFIER":
        # Unexpected response - log and fail safely
        audit_log_attempt(
            event_type="login_initiate",
            username=email,
            success=False,
            error_code="UNEXPECTED_CHALLENGE",
            request_id=request_id,
            extra={"actual_challenge": challenge_name},
        )
        logger.warning(
            "Expected PASSWORD_VERIFIER challenge, got %s for user %s",
            challenge_name, email,
        )
        return internal_error("Authentication flow error")
    
    # DEBUG: log full response shape to diagnose missing Session
    import json as _debug_json
    _debug_safe = {k: (v if k != 'ChallengeParameters' else {pk: (pv[:30] + '...' if isinstance(pv, str) and len(pv) > 30 else pv) for pk, pv in v.items()}) for k, v in cognito_response.items() if k != 'ResponseMetadata'}
    logger.info("DEBUG Cognito response shape: %s", _debug_json.dumps(_debug_safe, default=str))
    
    # Cognito SDK response keys are typically PascalCase but check both
    session = cognito_response.get("Session") or cognito_response.get("session")
    challenge_parameters = cognito_response.get("ChallengeParameters") or cognito_response.get("challengeParameters") or {}
    
    # Note: Cognito may not return a Session for SRP flows.
    # Session is included only when needed (typically for MFA challenges, not for PASSWORD_VERIFIER).
    # Default to empty string so JSON serializes cleanly (avoid null in response).
    if session is None:
        session = ""
    
    # Step 4: Audit log success
    audit_log_attempt(
        event_type="login_initiate",
        username=email,
        success=True,
        request_id=request_id,
    )
    
    # Step 5: Return challenge data to client
    # Client uses these to compute PASSWORD_CLAIM_SIGNATURE, then calls /auth/verify-srp
    return success({
        "challenge": "PASSWORD_VERIFIER",
        "session": session,
        "challengeParameters": {
            # Pass through Cognito's challenge parameters - client SDK knows how to use them
            "USER_ID_FOR_SRP": challenge_parameters.get("USER_ID_FOR_SRP"),
            "SALT": challenge_parameters.get("SALT"),
            "SECRET_BLOCK": challenge_parameters.get("SECRET_BLOCK"),
            "SRP_B": challenge_parameters.get("SRP_B"),
        },
    })

# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
