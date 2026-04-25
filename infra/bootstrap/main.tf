# infra/bootstrap/main.tf
#
# Bootstrap resources for Terraform state management:
#   - S3 bucket: stores remote state (encrypted, versioned, locked-down)
#   - DynamoDB table: provides state locking to prevent concurrent corruption
#
# These resources are created with LOCAL state initially. After successful
# first apply, we migrate state to the bucket itself via:
#   terraform init -migrate-state
#
# Federal compliance:
#   SC-28 Protection of Information at Rest    - encryption enabled
#   AU-9  Protection of Audit Information     - state file is sensitive metadata
#   SC-13 Cryptographic Protection            - AES-256 server-side encryption
#   CM-2  Baseline Configuration              - state IS our baseline config
#   CP-9  Information System Backup           - versioning enables rollback
#   AC-3  Access Enforcement                  - public access blocked
#   SC-7  Boundary Protection                 - public access blocked

# ============================================================================
# S3 BUCKET FOR TERRAFORM STATE
# ============================================================================

resource "aws_s3_bucket" "tfstate" {
  bucket = "bis3-defense-tfstate"

  # force_destroy = false ensures we cannot accidentally delete this bucket
  # via `terraform destroy` if it contains state files. Critical safety control.
  force_destroy = false

  tags = {
    Name        = "bis3-defense-tfstate"
    Description = "Terraform remote state for all BIS3 Defense infrastructure"
    Critical    = "true"
  }
}

# Versioning lets us recover from accidental state corruption or deletion.
# Federal compliance: AU-9, CP-9
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption with AES-256 (SSE-S3).
# Federal compliance: SC-13, SC-28
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Block ALL public access at the bucket level. Defense in depth.
# Even if someone misconfigures bucket policy or ACLs, public access stays blocked.
# Federal compliance: AC-3, SC-7
resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================================================
# DYNAMODB TABLE FOR STATE LOCKING
# ============================================================================

resource "aws_dynamodb_table" "tfstate_lock" {
  name         = "bis3-defense-tfstate-lock"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "bis3-defense-tfstate-lock"
    Description = "DynamoDB lock table for Terraform state operations"
    Critical    = "true"
  }
}
