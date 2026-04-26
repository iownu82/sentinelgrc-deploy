"""
BIS3 Defense - auth-verify-challenge Cognito trigger

Cognito calls this trigger when the client returns the passkey assertion as
the answer to a CUSTOM_CHALLENGE. This is the actual cryptographic verification
step of the passkey authentication flow.

Cognito event shape (input):
{
  "request": {
    "userAttributes": {"sub": "...", "email": "..."},
    "privateChallengeParameters": {
      "challenge": "<base64url>",
      "user_sub": "...",
      "rp_id": "..."
    },
    "challengeAnswer": "<JSON-encoded WebAuthn assertion>"
  },
  "response": {
    "answerCorrect": true | false
  }
}

The challengeAnswer is a JSON string sent by the client containing the
WebAuthn AuthenticationCredential (rawId, response, clientDataJSON,
authenticatorData, signature, userHandle).

Federal compliance:
    AC-3, AU-2, AU-3, IA-2, IA-2(11), IA-5, SC-13, SC-23
"""

import base64
import json
import logging
import os
import sys
import time

sys.path.insert(0, "/var/task")
sys.path.insert(0, "/opt/python")  # Lambda layer

import boto3
from botocore.exceptions import ClientError
from webauthn import verify_authentication_response
from webauthn.helpers.exceptions import InvalidAuthenticationResponse


logger = logging.getLogger()
logger.setLevel(logging.INFO)


EXPECTED_ORIGIN = os.environ.get(
    "WEBAUTHN_EXPECTED_ORIGIN",
    "https://staging.app.bis3ai.com",
)
PASSKEY_TABLE = os.environ.get("PASSKEY_TABLE", "bis3-defense-passkey-credentials")

dynamodb = boto3.resource("dynamodb")


def lambda_handler(event: dict, context) -> dict:
    """
    Cognito VerifyAuthChallengeResponse trigger.

    Returns the same event with response.answerCorrect set.
    """
    request_id = context.aws_request_id if context else "no-context"
    request = event.get("request", {})
    response = event.setdefault("response", {})

    private_params = request.get("privateChallengeParameters", {})
    challenge_answer = request.get("challengeAnswer", "")

    user_sub = private_params.get("user_sub")
    expected_challenge_b64 = private_params.get("challenge")
    rp_id = private_params.get("rp_id")

    # Defensive checks - any missing param means we fail safely
    if not user_sub or not expected_challenge_b64 or not rp_id:
        logger.warning(json.dumps({
            "audit_event": "verify_auth_challenge_failed",
            "reason": "missing_private_params",
            "request_id": request_id,
        }))
        response["answerCorrect"] = False
        return event

    if not challenge_answer:
        logger.warning(json.dumps({
            "audit_event": "verify_auth_challenge_failed",
            "reason": "no_challenge_answer",
            "user_sub": user_sub,
            "request_id": request_id,
        }))
        response["answerCorrect"] = False
        return event

    # Parse the WebAuthn assertion the client sent
    try:
        credential_dict = json.loads(challenge_answer)
    except (json.JSONDecodeError, TypeError):
        logger.warning(json.dumps({
            "audit_event": "verify_auth_challenge_failed",
            "reason": "malformed_assertion",
            "user_sub": user_sub,
            "request_id": request_id,
        }))
        response["answerCorrect"] = False
        return event

    # Look up the credential by credential_id (the assertion contains it as "id")
    cred_id_str = credential_dict.get("id", "")
    if not cred_id_str:
        response["answerCorrect"] = False
        return event

    table = dynamodb.Table(PASSKEY_TABLE)
    try:
        # Use GSI to find credential by credential_id alone
        cred_resp = table.query(
            IndexName="credential_id_index",
            KeyConditionExpression="credential_id = :cid",
            ExpressionAttributeValues={":cid": cred_id_str},
        )
        cred_items = cred_resp.get("Items", [])
    except ClientError:
        logger.exception("Failed to look up credential")
        response["answerCorrect"] = False
        return event

    if not cred_items:
        logger.info(json.dumps({
            "audit_event": "verify_auth_challenge_failed",
            "reason": "credential_not_found",
            "user_sub": user_sub,
            "request_id": request_id,
        }))
        response["answerCorrect"] = False
        return event

    cred_item = cred_items[0]

    # Validate the credential belongs to the user being authenticated
    if cred_item.get("user_sub") != user_sub:
        logger.warning(json.dumps({
            "audit_event": "verify_auth_challenge_failed",
            "reason": "credential_user_mismatch",
            "user_sub": user_sub,
            "credential_owner": cred_item.get("user_sub"),
            "request_id": request_id,
        }))
        response["answerCorrect"] = False
        return event

    # Verify the assertion using py_webauthn
    try:
        # Decode stored values
        stored_pubkey_b64 = cred_item["public_key"]
        padded_pk = stored_pubkey_b64 + "=" * (-len(stored_pubkey_b64) % 4)
        stored_pubkey_bytes = base64.urlsafe_b64decode(padded_pk)

        padded_chal = expected_challenge_b64 + "=" * (-len(expected_challenge_b64) % 4)
        expected_challenge_bytes = base64.urlsafe_b64decode(padded_chal)

        verification = verify_authentication_response(
            credential=credential_dict,
            expected_challenge=expected_challenge_bytes,
            expected_origin=EXPECTED_ORIGIN,
            expected_rp_id=rp_id,
            credential_public_key=stored_pubkey_bytes,
            credential_current_sign_count=int(cred_item.get("sign_count", 0)),
            require_user_verification=False,
        )
    except InvalidAuthenticationResponse as e:
        logger.warning(json.dumps({
            "audit_event": "verify_auth_challenge_failed",
            "reason": "invalid_assertion",
            "user_sub": user_sub,
            "error": str(e),
            "request_id": request_id,
        }))
        response["answerCorrect"] = False
        return event
    except Exception:
        logger.exception("Unexpected error during assertion verification")
        response["answerCorrect"] = False
        return event

    # Update sign_count + last_used_at (anti-clone protection)
    iso_now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    try:
        table.update_item(
            Key={"user_sub": user_sub, "credential_id": cred_id_str},
            UpdateExpression="SET sign_count = :sc, last_used_at = :ts",
            ExpressionAttributeValues={
                ":sc": verification.new_sign_count,
                ":ts": iso_now,
            },
        )
    except ClientError:
        logger.exception("Failed to update sign_count - non-fatal but logged")

    logger.info(json.dumps({
        "audit_event": "verify_auth_challenge_success",
        "user_sub": user_sub,
        "credential_id": cred_id_str[:20] + "...",
        "friendly_name": cred_item.get("friendly_name", "unknown"),
        "request_id": request_id,
    }))

    response["answerCorrect"] = True
    return event


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler
