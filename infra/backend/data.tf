# infra/backend/data.tf
#
# Lookups for resources in other modules (foundation, AWS account-level).
# This module does not have direct Terraform dependencies on foundation -
# we look up by stable name/alias instead, keeping modules independent.

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Available Availability Zones in us-gov-west-1 (3 AZs: a, b, c)
# Used to spread Lambda subnets across AZs for HA
data "aws_availability_zones" "available" {
  state = "available"
}

# Platform KMS key from foundation module
data "aws_kms_alias" "platform" {
  name = "alias/bis3-defense-platform"
}

# Lambda execution roles from foundation module
# These have separation-of-duties scoping built in:
#   bis3-defense-lambda-auth  - for auth-* Lambdas (NO admin Cognito ops)
#   bis3-defense-lambda-admin - for admin-* Lambdas (privileged Cognito ops)
data "aws_iam_role" "lambda_auth" {
  name = "bis3-defense-lambda-auth"
}

data "aws_iam_role" "lambda_admin" {
  name = "bis3-defense-lambda-admin"
}

# Pre-created CloudWatch log groups from foundation module
# Each Lambda log group is KMS-encrypted with 365-day retention.
# We look these up to confirm they exist before deploying Lambdas.
locals {
  # 13 auth-* Lambda function names (will reference foundation's log groups)
  auth_lambda_names = [
    "auth-login",
    "auth-mfa",
    "auth-logout",
    "auth-refresh",
    "auth-me",
    "auth-setup-password",
    "auth-setup-mfa",
    "auth-forgot-password",
    "auth-reset-password",
    "auth-passkey-register-options",
    "auth-passkey-register-verify",
    "auth-passkey-auth-options",
    "auth-passkey-auth-verify",
  ]

  # 1 admin-* Lambda function name (uses lambda_admin role)
  admin_lambda_names = [
    "admin-force-password-reset",
  ]

  # Cognito User Pool ARN (from existing Cognito configured in earlier session)
  cognito_user_pool_id  = "us-gov-west-1_0VaQnbcFH"
  cognito_user_pool_arn = "arn:aws-us-gov:cognito-idp:us-gov-west-1:${data.aws_caller_identity.current.account_id}:userpool/us-gov-west-1_0VaQnbcFH"

  # VPC CIDR design - 10.50.0.0/16 with three /24 private subnets across 3 AZs
  vpc_cidr            = "10.50.0.0/16"
  private_subnet_cidrs = ["10.50.1.0/24", "10.50.2.0/24", "10.50.3.0/24"]
}
