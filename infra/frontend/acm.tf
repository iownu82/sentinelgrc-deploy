# infra/frontend/acm.tf
#
# ACM certificate for staging.app.bis3ai.com in us-gov-west-1.
# (NOT us-east-1 because we're not using commercial CloudFront - everything
# stays in GovCloud per the security-first architecture decision.)
#
# DNS validation: ACM creates _acme-challenge CNAME records that we must
# manually add to Cloudflare for bis3ai.com. After the records propagate,
# ACM auto-validates and issues the certificate.
#
# Federal compliance:
#   SC-12 Cryptographic Key Establishment - certificate provisioning
#   SC-13 Cryptographic Protection - TLS 1.2+ for all viewer connections
#   SC-23 Session Authenticity - prevents MITM via signed cert chain

resource "aws_acm_certificate" "staging" {
  domain_name       = "staging.app.bis3ai.com"
  validation_method = "DNS"

  # When we replace this cert (e.g., expand to *.bis3ai.com later), AWS
  # creates the new cert before destroying the old to avoid downtime.
  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "bis3-defense-staging-cert"
    Description = "ACM cert for staging.app.bis3ai.com"
    Domain      = "staging.app.bis3ai.com"
  }
}

# Wait for DNS validation to complete.
# This resource will block terraform apply until the DNS validation records
# (which YOU add to Cloudflare manually) are validated by ACM.
# Typical wait: 5-15 minutes after DNS records propagate.
resource "aws_acm_certificate_validation" "staging" {
  certificate_arn = aws_acm_certificate.staging.arn

  # Use a longer-than-default timeout to accommodate manual DNS step
  timeouts {
    create = "30m"
  }
}
