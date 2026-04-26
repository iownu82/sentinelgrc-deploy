# infra/cicd/data.tf
#
# Lookups for resources from other modules (foundation, frontend, backend)
# that the CI/CD deploy roles need permissions over.

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Fetch GitHub's TLS certificate thumbprint dynamically.
# This is the recommended pattern - hardcoded thumbprints can rotate.
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# Frontend stub Lambda from frontend module
data "aws_lambda_function" "frontend_stub" {
  function_name = "bis3-defense-frontend-stub"
}

# Frontend S3 bucket from frontend module
data "aws_s3_bucket" "frontend_app" {
  bucket = "bis3-defense-app-staging"
}

# Backend Lambda functions from backend module
# Listed explicitly so deploy permissions are scoped exactly
locals {
  # GitHub repo identifier - used in OIDC trust policy
  github_org  = "iownu82"
  github_repo = "csrmfc-ai"

  # OIDC subject pattern - allows pushes to any branch + tag
  # Tightened in Stage 5 to specific branches if desired
  github_subject_pattern = "repo:${local.github_org}/${local.github_repo}:*"

  # 17 backend Lambda function names (must match backend/data.tf)
  backend_lambda_names = [
    "bis3-defense-auth-login",
    "bis3-defense-auth-mfa",
    "bis3-defense-auth-logout",
    "bis3-defense-auth-refresh",
    "bis3-defense-auth-me",
    "bis3-defense-auth-setup-password",
    "bis3-defense-auth-setup-mfa",
    "bis3-defense-auth-forgot-password",
    "bis3-defense-auth-reset-password",
    "bis3-defense-auth-passkey-register-options",
    "bis3-defense-auth-passkey-register-verify",
    "bis3-defense-auth-passkey-auth-options",
    "bis3-defense-auth-passkey-auth-verify",
    "bis3-defense-auth-verify-srp",
    # Cognito CUSTOM_AUTH triggers (Stage 6C-2)
    "bis3-defense-auth-define-challenge",
    "bis3-defense-auth-create-challenge",
    "bis3-defense-auth-verify-challenge",
    "bis3-defense-admin-force-password-reset",
  ]

  # Frontend Lambda for code updates
  frontend_lambda_name = "bis3-defense-frontend-stub"

  # All Lambdas the backend deploy role can update
  all_deployable_lambdas = concat(local.backend_lambda_names, [local.frontend_lambda_name])

  # Deployable Lambda ARN pattern
  lambda_arn_prefix = "arn:aws-us-gov:lambda:us-gov-west-1:${data.aws_caller_identity.current.account_id}:function"
}
