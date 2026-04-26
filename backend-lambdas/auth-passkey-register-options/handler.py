"""
BIS3 Defense - auth-passkey-register-options Lambda

Generates a WebAuthn registration challenge for an authenticated user who
wants to register a new passkey or YubiKey.

Flow:
  1. User is already logged in (verified via access token cookie)
  2. Lambda generates a random challenge + RP ID + user ID
  3. Returns options to the client - client passes them to the browser's
     navigator.credentials.create() WebAuthn API
  4. User taps YubiKey or biometric
  5. Browser returns attestation - sent to /auth/passkey/register-verify

Federal compliance:
    AC-3    Access Enforcement (must be authenticated to register a passkey)
    AU-2    Audit Events
    IA-2    Identification and Authentication
    IA-2(11) Hardware Authenticator (YubiKey)
    IA-5    Authenticator Management (registration of new authenticator)
    SC-13   Cryptographic Protection (challenge is cryptographically random)
"""

import base64
import json
import logging
import os
import secrets
import sys

sys.path.insert(0, "/var/task")
sys.path.insert(0, "/opt/python")  # Lambda layer path

from cookies import extract_auth_token
from jwt_verifier import verify_id_token, verify_access_token, JWTVerificationError
from responses import success, bad_request, unauthorized, internal_error

import boto3
from botocore.exceptions import ClientError

from webauthn import generate_registration_options, options_to_json
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    AuthenticatorAttachment,
    ResidentKeyRequirement,
)


logger = logging.getLogger()
logger.setLevel(logging.INFO)


# WebAuthn relying party config
RP_ID = os.environ.get("WEBAUTHN_RP_ID", "staging.app.bis3ai.com")
RP_NAME = "BIS3 Defense"
PASSKEY_TABLE = os.environ.get("PASSKEY_TABLE", "bis3-defense-passkey-credentials")

# Challenge cache table for tracking active challenges (prevents replay)
# We store the challenge in DynamoDB with a short TTL so the verify Lambda
# can confirm the response matches a recently-issued challenge.
CHALLENGE_TTL_SECONDS = 300  # 5 minutes

dynamodb = boto3.resource("dynamodb")


def lambda_handler(event: dict, context) -> dict:
    """
    POST /auth/passkey/register-options

    Request body (optional):
        {
            "friendlyName": "YubiKey 5C NFC"  (optional, used in success response)
        }

    Response:
        {
            "options": {
                "rp": {"name": "BIS3 Defense", "id": "staging.app.bis3ai.com"},
                "user": {"id": "...", "name": "user@example.com", "displayName": "..."},
                "challenge": "...",
                "pubKeyCredParams": [...],
                "timeout": 60000,
                "authenticatorSelection": {...},
                ...
            },
            "challengeId": "...",
            "expiresIn": 300
        }
    """
    request_id = context.aws_request_id if context else "no-context"

    # Step 1: User must be authenticated (registering passkey to an existing identity)
    id_token, access_token = extract_auth_token(event)

    if not id_token and not access_token:
        return unauthorized("Authentication required to register a passkey")

    try:
        if id_token:
            claims = verify_id_token(id_token)
        else:
            claims = verify_access_token(access_token)
    except JWTVerificationError as e:
        logger.info("JWT verification failed: %s", str(e))
        return unauthorized("Session expired or invalid")

    user_sub = claims.get("sub")
    user_email = claims.get("email") or claims.get("cognito:username") or user_sub
    user_display = claims.get("email") or "BIS3 Defense User"

    if not user_sub:
        logger.error("No sub claim in verified token")
        return internal_error("Invalid session")

    # Step 2: Look up existing credentials for this user (we exclude them so
    # the user can't register the same authenticator twice)
    table = dynamodb.Table(PASSKEY_TABLE)
    try:
        response = table.query(
            KeyConditionExpression="user_sub = :sub",
            ExpressionAttributeValues={":sub": user_sub},
        )
        existing_credentials = response.get("Items", [])
    except ClientError as e:
        logger.exception("Failed to query existing credentials")
        return internal_error("Failed to read credentials")

    exclude_credentials = []
    for cred in existing_credentials:
        # WebAuthn library expects PublicKeyCredentialDescriptor objects;
        # we'll pass them as dicts and the library will accept them.
        exclude_credentials.append({
            "id": base64.urlsafe_b64decode(cred["credential_id"] + "=="),
            "type": "public-key",
        })

    # Step 3: Generate the registration challenge using py_webauthn
    try:
        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=user_sub.encode("utf-8"),
            user_name=user_email,
            user_display_name=user_display,
            timeout=60000,  # 60s for the user to tap their key
            # Federal requirement: prefer cross-platform authenticators (YubiKey)
            # but allow platform authenticators (Touch ID) too
            authenticator_selection=AuthenticatorSelectionCriteria(
                user_verification=UserVerificationRequirement.PREFERRED,
                resident_key=ResidentKeyRequirement.PREFERRED,
            ),
            exclude_credentials=exclude_credentials,
        )
    except Exception as e:
        logger.exception("Failed to generate registration options")
        return internal_error("Failed to generate challenge")

    # Step 4: Save the challenge to DynamoDB with TTL so verify can validate it
    challenge_b64 = base64.urlsafe_b64encode(options.challenge).decode("utf-8").rstrip("=")
    challenge_id = secrets.token_urlsafe(16)

    import time
    expires_at = int(time.time()) + CHALLENGE_TTL_SECONDS

    try:
        table.put_item(Item={
            "user_sub": user_sub,
            "credential_id": f"_challenge_{challenge_id}",  # underscore prefix = challenge marker
            "challenge": challenge_b64,
            "purpose": "registration",
            "expires_at": expires_at,
        })
    except ClientError as e:
        logger.exception("Failed to save challenge")
        return internal_error("Failed to issue challenge")

    # Step 5: Audit log
    logger.info(json.dumps({
        "audit_event": "passkey_register_options_issued",
        "user_sub": user_sub,
        "challenge_id": challenge_id,
        "request_id": request_id,
    }))

    # Step 6: Return options to client (browser passes to navigator.credentials.create)
    return success({
        "options": json.loads(options_to_json(options)),
        "challengeId": challenge_id,
        "expiresIn": CHALLENGE_TTL_SECONDS,
    })


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
