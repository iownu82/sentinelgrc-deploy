# ============================================================================
# Cognito User Pool - Imported from existing infrastructure
# ============================================================================
#
# This User Pool was originally created outside of Terraform.
# Resource block matches the live config exactly so `terraform import`
# followed by `terraform plan` shows zero drift.
#
# Federal compliance:
#   AC-3, AC-7, IA-2, IA-2(1), IA-5, IA-5(1), IA-6, SC-13, SC-23

resource "aws_cognito_user_pool" "main" {
  name = "csrmfc-users"

  # Email-only sign-in (no username field) - federal best practice
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy - matches federal AAL2 / NIST 800-63B requirements
  password_policy {
    minimum_length                   = 15
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    password_history_size            = 24
    temporary_password_validity_days = 1
  }

  # MFA required (TOTP via SOFTWARE_TOKEN_MFA)
  mfa_configuration = "ON"

  software_token_mfa_configuration {
    enabled = true
  }

  # Admin-only user creation (no self-registration)
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # Account recovery: verified email only (no SMS)
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email config - using Cognito's default sender for now
  # (SES integration was set up separately and is verified)
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Verification message template - confirm with code
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  user_attribute_update_settings {
    attributes_require_verification_before_update = []
  }

  deletion_protection = "INACTIVE"
  user_pool_tier      = "ESSENTIALS"

  # Custom attributes for multi-tenancy + role-based access control
  schema {
    name                     = "role"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  schema {
    name                     = "tenant_id"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = false
    required                 = false
    string_attribute_constraints {
      min_length = 36
      max_length = 36
    }
  }

  tags = {
    Environment = "Production"
    Project     = "CSRMFC"
  }

  # Lambda triggers for CUSTOM_AUTH (passkey) flow
  lambda_config {
    define_auth_challenge          = local.cognito_trigger_define_arn
    create_auth_challenge          = local.cognito_trigger_create_arn
    verify_auth_challenge_response = local.cognito_trigger_verify_arn
  }
}

# ============================================================================
# Cognito CUSTOM_AUTH trigger ARNs
# ============================================================================
# These are computed locals so we don't have a cross-module dependency cycle.
# The trigger Lambda functions live in the backend module; we reference their
# ARNs by deterministic naming convention.
locals {
  cognito_trigger_define_arn = "arn:aws-us-gov:lambda:us-gov-west-1:${data.aws_caller_identity.current.account_id}:function:bis3-defense-auth-define-challenge"
  cognito_trigger_create_arn = "arn:aws-us-gov:lambda:us-gov-west-1:${data.aws_caller_identity.current.account_id}:function:bis3-defense-auth-create-challenge"
  cognito_trigger_verify_arn = "arn:aws-us-gov:lambda:us-gov-west-1:${data.aws_caller_identity.current.account_id}:function:bis3-defense-auth-verify-challenge"
}

# ============================================================================
# Lambda permissions - allow Cognito to invoke the 3 trigger Lambdas
# ============================================================================
# Cognito's service principal needs explicit permission to invoke each trigger.
# Without these, Cognito calls fail silently with InvalidLambdaResponseException.

resource "aws_lambda_permission" "cognito_invoke_define" {
  statement_id  = "AllowCognitoInvokeDefineChallenge"
  action        = "lambda:InvokeFunction"
  function_name = "bis3-defense-auth-define-challenge"
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "cognito_invoke_create" {
  statement_id  = "AllowCognitoInvokeCreateChallenge"
  action        = "lambda:InvokeFunction"
  function_name = "bis3-defense-auth-create-challenge"
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_lambda_permission" "cognito_invoke_verify" {
  statement_id  = "AllowCognitoInvokeVerifyChallenge"
  action        = "lambda:InvokeFunction"
  function_name = "bis3-defense-auth-verify-challenge"
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# Output for use by other modules and Lambda env vars
output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.main.id
  description = "Cognito User Pool ID"
}

output "cognito_user_pool_arn" {
  value       = aws_cognito_user_pool.main.arn
  description = "Cognito User Pool ARN"
}

# ============================================================================
# Cognito User Pool Client (csrmfc-web)
# ============================================================================
# Imported from existing client anrf7jlfgfevp7c6esu705p7k.
# Resource block matches the live config exactly.

resource "aws_cognito_user_pool_client" "web" {
  name         = "csrmfc-web"
  user_pool_id = aws_cognito_user_pool.main.id

  # Allowed auth flows
  # CUSTOM_AUTH added in Stage 6C-2 for passkey-to-session flow
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_CUSTOM_AUTH",
  ]

  # Token validity
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Auth session duration (for SRP / MFA / CUSTOM_AUTH challenge chain)
  auth_session_validity = 3

  # Enable refresh token revocation (required for our auth-logout Lambda)
  enable_token_revocation = true

  # Don't differentiate user-not-found from invalid-credentials (IA-6)
  prevent_user_existence_errors = "ENABLED"
}

output "cognito_user_pool_client_id" {
  value       = aws_cognito_user_pool_client.web.id
  description = "Cognito User Pool Client ID for the web SPA"
}
