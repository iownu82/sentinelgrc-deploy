"""
BIS3 Defense - auth-create-challenge Cognito trigger

Cognito calls this after DefineAuthChallenge says CUSTOM_CHALLENGE.

We do NOT generate a fresh challenge here. The browser already started its
WebAuthn ceremony against the challenge issued by /auth/passkey/auth-options.
The browser signed THAT challenge - we must use the same one for verification
or the assertion check will fail (clientDataJSON.challenge != expected).

This trigger looks up the original challenge by challenge_id (passed via
ClientMetadata on admin_initiate_auth) and stashes it in
privateChallengeParameters for VerifyAuthChallengeResponse to compare against.

Federal compliance:
    AC-3, AU-2, AU-3, IA-2, IA-2(11), IA-5, SC-13, SC-23
"""
import json
import logging
import os
import sys

sys.path.insert(0, "/var/task")
sys.path.insert(0, "/opt/python")

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

RP_ID = os.environ["WEBAUTHN_RP_ID"]
PASSKEY_TABLE = os.environ.get("PASSKEY_TABLE", "bis3-defense-passkey-credentials")

dynamodb = boto3.resource("dynamodb")


def _error(event, response, reason, request_id, user_sub=None):
    logger.warning(json.dumps({
        "audit_event": "create_auth_challenge_failed",
        "reason": reason,
        "user_sub": user_sub,
        "request_id": request_id,
    }))
    response["publicChallengeParameters"] = {"error": reason}
    response["privateChallengeParameters"] = {"error": reason}
    response["challengeMetadata"] = "ERROR"
    return event


def lambda_handler(event: dict, context) -> dict:
    request_id = context.aws_request_id if context else "no-context"
    request = event.get("request", {})
    response = event.setdefault("response", {})

    user_attributes = request.get("userAttributes", {})
    user_sub = user_attributes.get("sub")

    logger.info(json.dumps({
        "audit_event": "create_auth_challenge",
        "user_sub": user_sub,
        "request_id": request_id,
    }))

    if not user_sub:
        return _error(event, response, "no_user", request_id)

    # Find the most recent un-expired authentication challenge for this user.
    # auth-passkey-auth-options writes rows under (user_sub, _challenge_<id>)
    # with purpose="authentication" and an expires_at field. We pick the
    # newest one to defend against the user having stale challenge rows.
    import time as _time
    now_ts = int(_time.time())
    try:
        table = dynamodb.Table(PASSKEY_TABLE)
        chal_resp = table.query(
            KeyConditionExpression="user_sub = :sub AND begins_with(credential_id, :prefix)",
            ExpressionAttributeValues={
                ":sub": user_sub,
                ":prefix": "_challenge_",
            },
        )
        all_chal_items = chal_resp.get("Items", [])
    except ClientError:
        logger.exception("Failed to query challenges")
        return _error(event, response, "challenge_lookup_failed", request_id, user_sub)

    # Filter to authentication-purpose challenges that have not expired
    valid = [
        it for it in all_chal_items
        if it.get("purpose") == "authentication"
        and int(it.get("expires_at", 0)) > now_ts
    ]
    if not valid:
        return _error(event, response, "no_active_challenge", request_id, user_sub)

    # Pick the one with the largest expires_at (most recently issued)
    chal_item = max(valid, key=lambda it: int(it.get("expires_at", 0)))

    challenge_b64 = chal_item.get("challenge")
    if not challenge_b64:
        return _error(event, response, "challenge_value_missing", request_id, user_sub)

    response["publicChallengeParameters"] = {
        "rp_id": RP_ID,
    }
    response["privateChallengeParameters"] = {
        "challenge": challenge_b64,
        "user_sub": user_sub,
        "rp_id": RP_ID,
    }
    response["challengeMetadata"] = "PASSKEY"

    logger.info(json.dumps({
        "audit_event": "create_auth_challenge_complete",
        "user_sub": user_sub,
        "request_id": request_id,
    }))

    return event


handler = lambda_handler
