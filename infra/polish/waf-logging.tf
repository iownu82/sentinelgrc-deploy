# infra/polish/waf-logging.tf
#
# WAFv2 logging to CloudWatch for both frontend and backend WAFs.
# Captures every WAF allow/block decision with full request payload.
#
# Critical AWS requirement: WAFv2 CloudWatch log group names MUST start
# with "aws-waf-logs-" prefix. AWS enforces this at the API level.
#
# Federal compliance:
#   AU-2     Audit Events - WAF decisions are security-relevant events
#   AU-3     Content of Audit Records - full request metadata captured
#   AU-9     Protection of Audit Information - KMS-encrypted log groups
#   AU-11    Audit Record Retention - 365 days
#   SI-4     Information System Monitoring - WAF logs feed monitoring
#   SI-4(2)  Automated Tools for Real-Time Analysis - CloudWatch Insights queryable
#   IR-4     Incident Handling - WAF logs are forensic evidence
#   IR-5     Incident Monitoring - real-time visibility into attacks

# ============================================================================
# CLOUDWATCH LOG GROUPS (one per WAF, KMS-encrypted, 365-day retention)
# ============================================================================

resource "aws_cloudwatch_log_group" "waf_frontend" {
  name              = "aws-waf-logs-bis3-defense-frontend"
  retention_in_days = 365
  kms_key_id        = local.kms_arn

  tags = {
    Name        = "aws-waf-logs-bis3-defense-frontend"
    Description = "WAFv2 logs for frontend ACL - staging.app.bis3ai.com"
    LogType     = "wafv2"
    WAFTarget   = "frontend"
  }
}

resource "aws_cloudwatch_log_group" "waf_backend" {
  name              = "aws-waf-logs-bis3-defense-api"
  retention_in_days = 365
  kms_key_id        = local.kms_arn

  tags = {
    Name        = "aws-waf-logs-bis3-defense-api"
    Description = "WAFv2 logs for backend API ACL - api.staging.app.bis3ai.com"
    LogType     = "wafv2"
    WAFTarget   = "backend"
  }
}

# ============================================================================
# WAFv2 LOGGING CONFIGURATIONS
# ============================================================================

# Frontend WAF logging - logs to its dedicated log group.
# All actions (ALLOW + BLOCK + COUNT) are logged by default.
# Redacted fields: standard - we don't redact for staging visibility.
# In Stage 6 we may add field redaction for password/cookie fields.
resource "aws_wafv2_web_acl_logging_configuration" "frontend" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_frontend.arn]
  resource_arn            = data.aws_wafv2_web_acl.frontend.arn

  # Redact authorization headers from logs to avoid leaking tokens
  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}

resource "aws_wafv2_web_acl_logging_configuration" "backend" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_backend.arn]
  resource_arn            = data.aws_wafv2_web_acl.backend.arn

  # Redact sensitive auth fields from auth API logs
  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}
