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
  # NOTE: This is empty initially to match imported state.
  # We'll add it in a separate apply after import succeeds.
  lambda_config {}
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
