# infra/foundation/cloudwatch.tf
#
# Pre-created CloudWatch Log Groups for Lambda functions, API Gateway, and
# cross-cutting application audit logs. All log groups encrypted with the
# platform KMS key (from kms.tf) and configured with 365-day retention.
#
# Why pre-create (vs letting Lambda auto-create):
#   - Lambda auto-creates log groups on first invocation, but with default
#     settings: NO encryption, NO retention policy.
#   - That's a federal compliance gap (AU-9, AU-11 violations).
#   - Pre-creating in Terraform enforces encryption + retention from day one.
#
# Federal compliance:
#   AU-2  Audit Events - structured logging foundation
#   AU-9  Protection of Audit Information - KMS-encrypted at rest
#   AU-11 Audit Record Retention - 365-day retention enforced declaratively
#   SC-13 Cryptographic Protection - AES-256-GCM via platform KMS key
#   SC-28 Protection of Information at Rest - encryption
#   CM-2  Baseline Configuration - declarative, version-controlled

# ============================================================================
# LAMBDA FUNCTION LOG GROUPS (14 total)
# ============================================================================

# List of Lambda functions that will exist in Stage 4-6 of the v1.10 build.
# Each gets a pre-created log group with KMS encryption + 365-day retention.
# Naming convention: /aws/lambda/bis3-defense-{function-name}
# This matches AWS Lambda's default log group naming pattern, so when Lambdas
# are deployed they'll write to these existing groups instead of creating new
# unencrypted ones.
locals {
  lambda_function_names = [
    # Authentication endpoints (Phase 2 build)
    "auth-login",
    "auth-mfa",
    "auth-logout",
    "auth-refresh",
    "auth-me",
    "auth-setup-password",
    "auth-setup-mfa",
    "auth-forgot-password",
    "auth-reset-password",

    # Passkey/WebAuthn endpoints (Phase 2 build)
    "auth-passkey-register-options",
    "auth-passkey-register-verify",
    "auth-passkey-auth-options",
    "auth-passkey-auth-verify",

    # Admin endpoints (Phase 2/3 build)
    "admin-force-password-reset",
  ]
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each = toset(local.lambda_function_names)

  name              = "/aws/lambda/bis3-defense-${each.key}"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.platform.arn

  tags = {
    Name        = "bis3-defense-${each.key}-logs"
    Description = "Lambda function logs for bis3-defense-${each.key}"
    Function    = each.key
    LogType     = "lambda"
  }
}

# ============================================================================
# API GATEWAY ACCESS LOGS
# ============================================================================

# Captures every HTTP request to the API Gateway HTTP API.
# Used for audit (AU-2), debugging, and security monitoring.
resource "aws_cloudwatch_log_group" "api_gateway_access" {
  name              = "/aws/apigateway/bis3-defense-api"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.platform.arn

  tags = {
    Name        = "bis3-defense-api-gateway-access-logs"
    Description = "API Gateway HTTP API access logs for bis3-defense-api"
    LogType     = "api-gateway"
  }
}

# ============================================================================
# APPLICATION / AUDIT LOG GROUP
# ============================================================================

# Cross-cutting log group for application-level security events.
# Lambdas write structured JSON events here for actions that span functions
# (e.g., admin force-password-reset events, security incidents, audit trails).
# This is the primary destination for events that map to AU-2 / AU-3 controls
# until RDS audit table is provisioned.
resource "aws_cloudwatch_log_group" "application" {
  name              = "/bis3-defense/application"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.platform.arn

  tags = {
    Name        = "bis3-defense-application-audit-logs"
    Description = "Cross-cutting application audit log for security-relevant events"
    LogType     = "application-audit"
  }
}
