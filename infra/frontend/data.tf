# infra/frontend/data.tf
#
# Lookups for foundation module resources by stable name.
# This decouples frontend from foundation's state file.
#
# We reference the platform KMS key by its alias (created in foundation/kms.tf)
# rather than hardcoding the key ID, so key rotation/replacement is transparent.

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Platform KMS key (from foundation module)
# Alias: alias/bis3-defense-platform
# Used to encrypt: S3 frontend bucket, Lambda environment variables (if any),
# CloudWatch log groups (Lambda will reuse foundation's pre-created log groups
# in Stage 7 when we add real auth Lambdas)
data "aws_kms_alias" "platform" {
  name = "alias/bis3-defense-platform"
}
