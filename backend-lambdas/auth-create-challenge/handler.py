"""
BIS3 Defense - auth-create-challenge Cognito trigger

Cognito calls this trigger after DefineAuthChallenge says CUSTOM_CHALLENGE.
We generate a WebAuthn authentication challenge here.

The challenge is split into:
  - publicChallengeParameters: sent to the client (the WebAuthn options)
  - privateChallengeParameters: kept server-side, available to VerifyAuthChallengeResponse

Cognito event shape (input):
{
  "request": {
    "userAttributes": {"sub": "...", "email": "..."},
    "challengeName": "CUSTOM_CHALLENGE",
    "session": [...]
  },
  "response": {
    "publicChallengeParameters": {...},
    "privateChallengeParameters": {...},
    "challengeMetadata": "..."
  }
}

Federal compliance:
    AC-3, AU-2, AU-3, IA-2, IA-2(11), IA-5, SC-13, SC-23
"""

import base64
import json
import logging
import os
import sys

sys.path.insert(0, "/var/task")
sys.path.insert(0, "/opt/python")  # Lambda layer

import boto3
from botocore.exceptions import ClientError
from webauthn import generate_authentication_options, options_to_json
from webauthn.helpers.structs import (
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
)


logger = logging.getLogger()
logger.setLevel(logging.INFO)


RP_ID = os.environ.get("WEBAUTHN_RP_ID", "staging.app.bis3ai.com")
PASSKEY_TABLE = os.environ.get("PASSKEY_TABLE", "bis3-defense-passkey-credentials")

dynamodb = boto3.resource("dynamodb")


def lambda_handler(event: dict, context) -> dict:
    """
    Cognito CreateAuthChallenge trigger.

    Generates a WebAuthn authentication challenge and stashes it in the
    Cognito session for VerifyAuthChallengeResponse to validate against.
    """
    request_id = context.aws_request_id if context else "no-context"
    request = event.get("request", {})
    response = event.setdefault("response", {})

    user_attributes = request.get("userAttributes", {})
    user_sub = user_attributes.get("sub")
    user_email = user_attributes.get("email", "unknown")

    logger.info(json.dumps({
        "audit_event": "create_auth_challenge",
        "user_sub": user_sub,
        "request_id": request_id,
    }))

    if not user_sub:
        # Should not happen if user is in Cognito, but defensive
        logger.error("CreateAuthChallenge called without user sub")
        # Return empty challenge - VerifyAuthChallengeResponse will fail
        response["publicChallengeParameters"] = {"error": "no_user"}
        response["privateChallengeParameters"] = {"error": "no_user"}
        response["challengeMetadata"] = "ERROR"
        return event

    # Look up the user's registered credentials
    allow_credentials = []
    try:
        table = dynamodb.Table(PASSKEY_TABLE)
        resp = table.query(
            KeyConditionExpression="user_sub = :sub",
            ExpressionAttributeValues={":sub": user_sub},
        )
        for item in resp.get("Items", []):
            cred_id_str = item.get("credential_id", "")
            # Skip challenge entries
            if cred_id_str.startswith("_challenge_"):
                continue
            try:
                padded = cred_id_str + "=" * (-len(cred_id_str) % 4)
                cred_id_bytes = base64.urlsafe_b64decode(padded)
                transports = item.get("transports", [])
                allow_credentials.append(
                    PublicKeyCredentialDescriptor(
                        id=cred_id_bytes,
                        transports=transports if transports else None,
                    )
                )
            except Exception:
                logger.warning("Skipping malformed credential id")
                continue
    except ClientError:
        logger.exception("Failed to query credentials")
        # Continue with empty allowCredentials - WebAuthn will fail naturally

    # Generate the WebAuthn challenge
    try:
        options = generate_authentication_options(
            rp_id=RP_ID,
            timeout=60000,
            allow_credentials=allow_credentials if allow_credentials else None,
            user_verification=UserVerificationRequirement.PREFERRED,
        )
    except Exception:
        logger.exception("Failed to generate WebAuthn options")
        response["publicChallengeParameters"] = {"error": "generate_failed"}
        response["privateChallengeParameters"] = {"error": "generate_failed"}
        response["challengeMetadata"] = "ERROR"
        return event

    # Encode challenge for transport
    challenge_b64 = base64.urlsafe_b64encode(options.challenge).decode("utf-8").rstrip("=")
    options_json = json.loads(options_to_json(options))

    # Cognito limits publicChallengeParameters values to strings
    # We pass the challenge options as a JSON-encoded string
    response["publicChallengeParameters"] = {
        "webauthn_options": json.dumps(options_json),
        "rp_id": RP_ID,
    }

    # Private parameters are also strings - we keep the challenge for verification
    response["privateChallengeParameters"] = {
        "challenge": challenge_b64,
        "user_sub": user_sub,
        "rp_id": RP_ID,
    }

    response["challengeMetadata"] = "PASSKEY"

    logger.info(json.dumps({
        "audit_event": "create_auth_challenge_complete",
        "user_sub": user_sub,
        "credentials_count": len(allow_credentials),
        "request_id": request_id,
    }))

    return event


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
