# infra/frontend/s3-frontend.tf
#
# S3 bucket for the BIS3 Defense React SPA frontend.
# Empty for tonight's skeleton - real SPA bundle deployed via CI/CD in Stage 7.
# 
# Federal compliance:
#   SC-13 Cryptographic Protection - KMS-encrypted using platform key
#   SC-28 Protection of Information at Rest - all objects encrypted
#   SC-7  Boundary Protection - public access fully blocked
#   AC-3  Access Enforcement - bucket policy will restrict to authorized callers only
#   CP-9  Information System Backup - versioning enabled
#   CM-2  Baseline Configuration - declarative
#   AU-2  Audit Events - bucket access events captured by CloudTrail (foundation module)

resource "aws_s3_bucket" "frontend" {
  bucket        = "bis3-defense-app-staging"
  force_destroy = false

  tags = {
    Name        = "bis3-defense-app-staging"
    Description = "Static SPA assets for staging.app.bis3ai.com - populated in Stage 7"
    Purpose     = "frontend-spa-hosting"
  }
}

# Versioning - enables rollback if a bad deploy ships
resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption with platform KMS key (customer-managed)
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = data.aws_kms_alias.platform.target_key_arn
    }
    bucket_key_enabled = true
  }
}

# Block ALL public access - this bucket is only ever read by Lambda/CloudFront
# (in Stage 7) via the bucket policy, never directly by the public.
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Ownership controls - the bucket owner controls all objects (no ACL surprises)
resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}
