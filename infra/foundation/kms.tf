# infra/foundation/kms.tf
#
# Customer-managed KMS key for the BIS3 Defense platform.
# Used to encrypt CloudWatch Logs, Secrets Manager entries, and future
# resources requiring stricter encryption than AWS-managed defaults.
#
# Federal compliance:
#   SC-12 Cryptographic Key Establishment and Management
#   SC-12(2) Key Rotation - automatic annual rotation enabled
#   SC-13 Cryptographic Protection - AES-256-GCM (FIPS 140-2 validated)
#   SC-28 Protection of Information at Rest - encrypts data at rest
#   AU-9 Protection of Audit Information - log encryption keys
#   AC-3 Access Enforcement - key policy controls usage

# ============================================================================
# DATA SOURCES
# ============================================================================

# Get the current AWS account ID for use in the key policy
data "aws_caller_identity" "current" {}

# ============================================================================
# CUSTOMER-MANAGED KMS KEY
# ============================================================================

resource "aws_kms_key" "platform" {
  description = "BIS3 Defense platform encryption key for CloudWatch Logs, Secrets Manager, and future encrypted resources"

  # Symmetric encrypt/decrypt key. AES-256-GCM under the hood.
  # FIPS 140-2 validated cryptography (SC-13 compliance).
  key_usage                = "ENCRYPT_DECRYPT"
  customer_master_key_spec = "SYMMETRIC_DEFAULT"

  # Annual automatic key rotation. Satisfies SC-12(2).
  # AWS rotates the key material annually; old key versions remain available
  # for decrypting previously-encrypted data.
  enable_key_rotation = true

  # 30-day deletion window. If we ever accidentally schedule key deletion,
  # we have 30 days to cancel before the key is permanently destroyed.
  # 7 (minimum) is too tight for federal change-control review.
  deletion_window_in_days = 30

  # Key policy: who can do what with this key.
  # We deliberately grant minimal access:
  #   1. Account root: full key administration via IAM (standard AWS pattern)
  #   2. CloudWatch Logs service: encrypt/decrypt log data in us-gov-west-1
  #   3. Secrets Manager service: encrypt/decrypt secret values
  # All other access requires explicit IAM policy grants on top of this.
  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "bis3-defense-platform-key-policy"
    Statement = [
      {
        Sid    = "EnableIAMUserPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws-us-gov:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogsEncryption"
        Effect = "Allow"
        Principal = {
          Service = "logs.us-gov-west-1.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws-us-gov:logs:us-gov-west-1:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      },
      {
        Sid    = "AllowSecretsManagerEncryption"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
            "kms:ViaService"    = "secretsmanager.us-gov-west-1.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "bis3-defense-platform-kms"
    Description = "Customer-managed KMS key for BIS3 Defense platform encryption"
    Critical    = "true"
  }
}

# ============================================================================
# KMS KEY ALIAS
# ============================================================================

# Human-friendly alias for the KMS key.
# Other Terraform modules can reference this key by its alias instead of UUID,
# making code more readable and resilient to key rotation/replacement.
resource "aws_kms_alias" "platform" {
  name          = "alias/bis3-defense-platform"
  target_key_id = aws_kms_key.platform.key_id
}
