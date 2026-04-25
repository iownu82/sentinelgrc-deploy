# infra/polish/data.tf
#
# Lookups for cross-module resources we attach polish features to.

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Platform KMS key (foundation module)
data "aws_kms_alias" "platform" {
  name = "alias/bis3-defense-platform"
}

# Frontend WAF ACL (frontend module)
data "aws_wafv2_web_acl" "frontend" {
  name  = "bis3-defense-frontend-acl"
  scope = "REGIONAL"
}

# Backend WAF ACL (backend module)
data "aws_wafv2_web_acl" "backend" {
  name  = "bis3-defense-api-acl"
  scope = "REGIONAL"
}

# CloudTrail S3 bucket (existing - used for AWS Config delivery)
data "aws_s3_bucket" "cloudtrail" {
  bucket = "csrmfc-cloudtrail-logs-884352654897"
}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  kms_arn    = data.aws_kms_alias.platform.target_key_arn
}
