"""
BIS3 Defense - auth-define-challenge Cognito trigger

Cognito calls this trigger at the start of a CUSTOM_AUTH flow and after every
challenge response. We decide what happens next:
  - First call (no session history): issue CUSTOM_CHALLENGE
  - After successful CUSTOM_CHALLENGE: issue tokens
  - After failed CUSTOM_CHALLENGE: fail authentication

Cognito event shape:
{
  "request": {
    "userAttributes": {...},
    "session": [
      {"challengeName": "...", "challengeResult": true/false, "challengeMetadata": "..."}
    ],
    "userNotFound": false
  },
  "response": {
    "challengeName": "<set by us>",
    "issueTokens": <set by us>,
    "failAuthentication": <set by us>
  }
}

Federal compliance:
    AC-3, AU-2, AU-3, IA-2, IA-2(11), IA-5, SC-13
"""

import json
import logging


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """
    Cognito DefineAuthChallenge trigger.

    Returns the same event with response fields set.
    """
    request_id = context.aws_request_id if context else "no-context"
    request = event.get("request", {})
    response = event.setdefault("response", {})

    session = request.get("session", [])
    user_not_found = request.get("userNotFound", False)

    # Audit log
    logger.info(json.dumps({
        "audit_event": "define_auth_challenge",
        "username": event.get("userName"),
        "session_length": len(session),
        "user_not_found": user_not_found,
        "request_id": request_id,
    }))

    # If user doesn't exist, fail (Cognito won't even call CreateAuthChallenge)
    if user_not_found:
        response["failAuthentication"] = True
        response["issueTokens"] = False
        return event

    # First call: no session history yet - issue CUSTOM_CHALLENGE
    if len(session) == 0:
        response["challengeName"] = "CUSTOM_CHALLENGE"
        response["issueTokens"] = False
        response["failAuthentication"] = False
        return event

    # We've already issued at least one challenge - check the last result
    last_challenge = session[-1]
    last_name = last_challenge.get("challengeName")
    last_result = last_challenge.get("challengeResult", False)

    # If our CUSTOM_CHALLENGE succeeded, issue tokens
    if last_name == "CUSTOM_CHALLENGE" and last_result:
        response["issueTokens"] = True
        response["failAuthentication"] = False
        return event

    # If our CUSTOM_CHALLENGE failed, fail authentication (no retry on passkey)
    if last_name == "CUSTOM_CHALLENGE" and not last_result:
        response["issueTokens"] = False
        response["failAuthentication"] = True
        return event

    # Defensive default: fail rather than allow unexpected flow states
    response["issueTokens"] = False
    response["failAuthentication"] = True
    return event


# Alias for Lambda's configured entry point: handler.handler
handler = lambda_handler

