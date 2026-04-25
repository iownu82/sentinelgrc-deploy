# infra/frontend/waf.tf
#
# WAFv2 Web ACL with AWS Managed Rules, attached to the REST API Gateway stage.
# Provides defense-in-depth perimeter protection.
#
# Rules (in order of priority):
#   1. AWSManagedRulesCommonRuleSet - OWASP Top 10 patterns
#   2. AWSManagedRulesKnownBadInputsRuleSet - known attack signatures
#   3. AWSManagedRulesAmazonIpReputationList - known malicious IPs
#   4. RateLimitPerIP - 2000 req / 5 min per source IP
#
# Federal compliance:
#   SC-7  Boundary Protection - WAF as additional perimeter
#   SI-3  Malicious Code Protection - blocks known attack patterns
#   SI-4  Information System Monitoring - WAF metrics to CloudWatch
#   AC-4  Information Flow Enforcement - rule-based filtering

resource "aws_wafv2_web_acl" "frontend" {
  name        = "bis3-defense-frontend-acl"
  description = "WAFv2 ACL protecting BIS3 Defense frontend REST API"
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
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
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
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSetMetric"
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
      metric_name                = "AWSManagedRulesAmazonIpReputationListMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Rate limiting per IP (2000 req per 5 min)
  rule {
    name     = "RateLimitPerIP"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitPerIPMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "BIS3DefenseFrontendACL"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "bis3-defense-frontend-acl"
    Description = "WAFv2 ACL with AWS Managed Rules for frontend REST API"
  }
}

# Attach WAF to the REST API stage
resource "aws_wafv2_web_acl_association" "frontend" {
  resource_arn = aws_api_gateway_stage.staging.arn
  web_acl_arn  = aws_wafv2_web_acl.frontend.arn
}
