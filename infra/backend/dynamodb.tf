# ============================================================================
# DynamoDB - Passkey credential storage
# ============================================================================
#
# Stores WebAuthn/FIDO2 credential data per user. Cognito user pool stores
# user identity; this table stores the cryptographic credentials registered
# to those users for passkey authentication.
#
# Schema:
#   PK (partition key):   user_sub        - Cognito sub UUID
#   SK (sort key):        credential_id   - base64url credential identifier
#   public_key            - COSE-encoded public key (bytes)
#   sign_count            - rolling counter (anti-clone detection per FIDO2 spec)
#   transports            - list of authenticator transports (usb, nfc, ble, internal)
#   aaguid                - authenticator AAGUID (helps identify YubiKey vs platform auth)
#   friendly_name         - user-supplied label ("YubiKey 5C NFC")
#   registered_at         - ISO8601 timestamp
#   last_used_at          - ISO8601 timestamp, updated on successful auth
#
# GSI for credential lookup during authentication (we know credential_id from
# the assertion but need to look up the user):
#   credential_id_index   - PK: credential_id
#
# Federal compliance:
#   AC-3    Access Enforcement (Lambda IAM role scoped to this table only)
#   AU-2    Audit Events (DynamoDB Streams -> CloudWatch Logs for credential changes)
#   CP-9    Backup (point-in-time recovery enabled)
#   IA-5    Authenticator Management
#   SC-13   Cryptographic Protection (encryption at rest with KMS CMK)
#   SC-28   Protection of Information at Rest

resource "aws_dynamodb_table" "passkey_credentials" {
  name         = "bis3-defense-passkey-credentials"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "user_sub"
  range_key = "credential_id"

  attribute {
    name = "user_sub"
    type = "S"
  }

  attribute {
    name = "credential_id"
    type = "S"
  }

  # GSI for credential-id-first lookup during authentication
  # (assertion comes back with credential_id, we need to find which user owns it)
  global_secondary_index {
    name            = "credential_id_index"
    hash_key        = "credential_id"
    projection_type = "ALL"
  }

  # Federal compliance: encryption at rest with our platform CMK
  server_side_encryption {
    enabled     = true
    kms_key_arn = data.aws_kms_alias.platform.target_key_arn
  }

  # Federal compliance: point-in-time recovery (CP-9 Backup)
  point_in_time_recovery {
    enabled = true
  }

  # Stream for audit logging (we'll add a Lambda subscriber later if needed)
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = {
    Name        = "bis3-defense-passkey-credentials"
    Description = "WebAuthn/FIDO2 credential storage for passkey authentication"
    DataClass   = "sensitive"
  }
}

# Output for use by Lambda IAM policies
output "passkey_credentials_table_arn" {
  value       = aws_dynamodb_table.passkey_credentials.arn
  description = "ARN of the passkey credentials DynamoDB table"
}

output "passkey_credentials_table_name" {
  value       = aws_dynamodb_table.passkey_credentials.name
  description = "Name of the passkey credentials DynamoDB table"
}

output "passkey_credentials_gsi_arn" {
  value       = "${aws_dynamodb_table.passkey_credentials.arn}/index/credential_id_index"
  description = "ARN of the credential_id GSI for IAM scoping"
}
