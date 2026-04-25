# infra/backend/waf.tf
#
# Separate WAFv2 ACL for the auth API with stricter rate limits than the frontend ACL.
# Frontend (Stage 3): 2000 req/5min — content browsing tolerates higher volume
# Backend  (Stage 4): 200 req/5min — auth endpoints get tight limits to deter
#                                     credential stuffing and brute force attacks
#
# Federal compliance:
#   SC-7    Boundary Protection - WAF as auth-specific perimeter
#   SI-3    Malicious Code Protection - blocks known attack patterns
#   SI-4    Information System Monitoring - WAF metrics to CloudWatch
#   AC-4    Information Flow Enforcement - rule-based filtering
#   AC-7    Unsuccessful Logon Attempts - rate limit deters brute force

resource "aws_wafv2_web_acl" "backend" {
  name        = "bis3-defense-api-acl"
  description = "WAFv2 ACL protecting BIS3 Defense auth API - stricter than frontend"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: Common rule set (OWASP Top 10)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "APIAWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Known bad inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "APIAWSManagedRulesKnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Amazon IP reputation list
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesAmazonIpReputationList"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "APIAWSManagedRulesAmazonIpReputationListMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: STRICT rate limiting per IP (200 req per 5 min) - auth-specific
  # Federal best practice for auth endpoints. Frontend ACL uses 2000.
  rule {
    name     = "RateLimitPerIPAuth"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 200
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "APIRateLimitPerIPMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "BIS3DefenseAPIACL"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "bis3-defense-api-acl"
    Description = "WAFv2 ACL with strict rate limits for auth API"
  }
}

# Attach WAF to the backend REST API stage
resource "aws_wafv2_web_acl_association" "backend" {
  resource_arn = aws_api_gateway_stage.staging.arn
  web_acl_arn  = aws_wafv2_web_acl.backend.arn
}
