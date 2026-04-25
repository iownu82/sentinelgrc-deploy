# infra/foundation/secrets.tf
#
# Secrets Manager skeleton entries for the BIS3 Defense platform.
# All secrets are KMS-encrypted with the platform key and follow the
# bis3-defense/staging/* path convention that the IAM Lambda roles allow.
#
# These are placeholders. Real values are populated outside Terraform via:
#   - Manual aws-cli put-secret-value commands
#   - GitHub Actions secret rotation pipelines
#   - Lambda functions writing rotated values
#
# Federal compliance:
#   IA-5    Authenticator Management - secrets stored in dedicated vault
#   SC-12   Cryptographic Key Management - secrets encrypted with CMK
#   SC-28   Protection of Information at Rest - KMS encryption
#   AC-6    Least Privilege - IAM scoping limits Lambda access
#   CM-3    Configuration Change Control - secret existence is declarative

# ============================================================================
# RDS MASTER CREDENTIALS
# ============================================================================

resource "aws_secretsmanager_secret" "rds_master" {
  name                    = "bis3-defense/staging/rds/master"
  description             = "RDS master credentials and connection details for csrmfc-db-prod"
  kms_key_id              = aws_kms_key.platform.arn
  recovery_window_in_days = 30

  tags = {
    Name        = "bis3-defense-staging-rds-master"
    SecretType  = "rds-credentials"
    Environment = "staging"
  }
}

resource "aws_secretsmanager_secret_version" "rds_master_placeholder" {
  secret_id = aws_secretsmanager_secret.rds_master.id
  secret_string = jsonencode({
    placeholder = true
    note        = "Populate with RDS connection details: host, port, dbname, username, password"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ============================================================================
# ANTHROPIC API KEY
# ============================================================================

resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name                    = "bis3-defense/staging/anthropic/api-key"
  description             = "Anthropic API key for RiskRadar AI tab and other AI-powered features"
  kms_key_id              = aws_kms_key.platform.arn
  recovery_window_in_days = 30

  tags = {
    Name        = "bis3-defense-staging-anthropic-api-key"
    SecretType  = "third-party-api-key"
    Environment = "staging"
  }
}

resource "aws_secretsmanager_secret_version" "anthropic_api_key_placeholder" {
  secret_id = aws_secretsmanager_secret.anthropic_api_key.id
  secret_string = jsonencode({
    placeholder = true
    note        = "Populate with Anthropic API key (rotated 2026-04-21 as bis3-defense-prod-2026-04-21)"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ============================================================================
# CSRF SECRET
# ============================================================================

resource "aws_secretsmanager_secret" "csrf_secret" {
  name                    = "bis3-defense/staging/csrf-secret"
  description             = "CSRF token signing secret for cookie-bound CSRF protection in auth flows"
  kms_key_id              = aws_kms_key.platform.arn
  recovery_window_in_days = 30

  tags = {
    Name        = "bis3-defense-staging-csrf-secret"
    SecretType  = "signing-key"
    Environment = "staging"
  }
}

resource "aws_secretsmanager_secret_version" "csrf_secret_placeholder" {
  secret_id = aws_secretsmanager_secret.csrf_secret.id
  secret_string = jsonencode({
    placeholder = true
    note        = "Populate with cryptographically random 32-byte secret (use: openssl rand -hex 32)"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
