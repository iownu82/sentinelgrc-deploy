# infra/backend/acm.tf
#
# ACM cert for api.staging.app.bis3ai.com in us-gov-west-1.
# DNS validation via Cloudflare CNAME (manual step).

resource "aws_acm_certificate" "api" {
  domain_name       = "api.staging.app.bis3ai.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "bis3-defense-api-staging-cert"
    Description = "ACM cert for api.staging.app.bis3ai.com"
    Domain      = "api.staging.app.bis3ai.com"
  }
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn

  timeouts {
    create = "30m"
  }
}
