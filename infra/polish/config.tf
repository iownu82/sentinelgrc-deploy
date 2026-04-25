# infra/polish/config.tf
#
# AWS Config recorder + delivery channel + 8 FedRAMP Moderate baseline rules.
# Continuous configuration recording across the entire GovCloud account.
#
# Federal compliance:
#   CM-2     Baseline Configuration - Config IS the baseline tracker
#   CM-3     Configuration Change Control - every change recorded
#   CM-6     Configuration Settings - rules check actual vs intended
#   CM-8     Component Inventory - Config has comprehensive inventory
#   AU-2     Audit Events - configuration changes are audit events
#   AU-12    Audit Generation - Config generates audit records
#   RA-5     Vulnerability Monitoring - rules detect misconfigurations
#   SI-4     Information System Monitoring

# ============================================================================
# S3 BUCKET FOR CONFIG SNAPSHOTS
# ============================================================================

resource "aws_s3_bucket" "config" {
  bucket        = "bis3-defense-aws-config-${local.account_id}"
  force_destroy = false

  tags = {
    Name        = "bis3-defense-aws-config"
    Description = "AWS Config snapshot delivery bucket"
    Purpose     = "config-snapshots"
  }
}

resource "aws_s3_bucket_public_access_block" "config" {
  bucket                  = aws_s3_bucket.config.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "config" {
  bucket = aws_s3_bucket.config.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  bucket = aws_s3_bucket.config.id

  rule {
    bucket_key_enabled = true
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = local.kms_arn
    }
  }
}

resource "aws_s3_bucket_policy" "config" {
  bucket = aws_s3_bucket.config.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSConfigBucketPermissionsCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.config.arn
      },
      {
        Sid    = "AWSConfigBucketExistenceCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.config.arn
      },
      {
        Sid    = "AWSConfigBucketDelivery"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.config.arn}/AWSLogs/${local.account_id}/Config/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# ============================================================================
# IAM ROLE FOR CONFIG RECORDER
# ============================================================================

data "aws_iam_policy_document" "config_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "config" {
  name               = "bis3-defense-aws-config-role"
  description        = "Service role for AWS Config recorder"
  assume_role_policy = data.aws_iam_policy_document.config_assume_role.json

  tags = {
    Name        = "bis3-defense-aws-config-role"
    Description = "AWS Config service role"
    RoleType    = "service-role"
  }
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws-us-gov:iam::aws:policy/service-role/AWS_ConfigRole"
}

# ============================================================================
# CONFIG RECORDER + DELIVERY CHANNEL
# ============================================================================

resource "aws_config_configuration_recorder" "main" {
  name     = "bis3-defense-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = false
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "bis3-defense-config-delivery"
  s3_bucket_name = aws_s3_bucket.config.id

  snapshot_delivery_properties {
    delivery_frequency = "TwentyFour_Hours"
  }

  depends_on = [
    aws_config_configuration_recorder.main,
    aws_s3_bucket_policy.config,
  ]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true

  depends_on = [aws_config_delivery_channel.main]
}

# ============================================================================
# MANAGED CONFIG RULES (FedRAMP Moderate baseline subset)
# ============================================================================

resource "aws_config_config_rule" "encrypted_volumes" {
  name = "bis3-defense-encrypted-volumes"
  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }
  depends_on = [aws_config_configuration_recorder_status.main]
}


resource "aws_config_config_rule" "iam_password_policy" {
  name = "bis3-defense-iam-password-policy"
  source {
    owner             = "AWS"
    source_identifier = "IAM_PASSWORD_POLICY"
  }
  depends_on = [aws_config_configuration_recorder_status.main]
}

resource "aws_config_config_rule" "s3_no_public_read" {
  name = "bis3-defense-s3-bucket-public-read-prohibited"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED"
  }
  depends_on = [aws_config_configuration_recorder_status.main]
}

resource "aws_config_config_rule" "s3_no_public_write" {
  name = "bis3-defense-s3-bucket-public-write-prohibited"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_WRITE_PROHIBITED"
  }
  depends_on = [aws_config_configuration_recorder_status.main]
}

resource "aws_config_config_rule" "s3_versioning" {
  name = "bis3-defense-s3-bucket-versioning-enabled"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_VERSIONING_ENABLED"
  }
  depends_on = [aws_config_configuration_recorder_status.main]
}

resource "aws_config_config_rule" "rds_encrypted" {
  name = "bis3-defense-rds-storage-encrypted"
  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }
  depends_on = [aws_config_configuration_recorder_status.main]
}

resource "aws_config_config_rule" "cloudtrail_enabled" {
  name = "bis3-defense-cloudtrail-enabled"
  source {
    owner             = "AWS"
    source_identifier = "CLOUD_TRAIL_ENABLED"
  }
  depends_on = [aws_config_configuration_recorder_status.main]
}
