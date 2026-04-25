# infra/frontend/outputs.tf
#
# Outputs from the frontend module.
# These will be referenced by Stage 7 (real frontend deploy) and by
# the manual DNS configuration steps you do at Cloudflare.

# ============================================================================
# ACM CERTIFICATE OUTPUTS (needed for DNS validation)
# ============================================================================

output "acm_certificate_arn" {
  description = "ARN of the ACM cert for staging.app.bis3ai.com"
  value       = aws_acm_certificate.staging.arn
}

output "acm_validation_records" {
  description = "DNS validation records to add at Cloudflare. Add each as CNAME record."
  value = [
    for opt in aws_acm_certificate.staging.domain_validation_options : {
      name  = opt.resource_record_name
      type  = opt.resource_record_type
      value = opt.resource_record_value
    }
  ]
}

# ============================================================================
# API GATEWAY OUTPUTS
# ============================================================================

output "api_gateway_id" {
  description = "ID of the REST API Gateway"
  value       = aws_api_gateway_rest_api.frontend.id
}

output "api_gateway_invoke_url" {
  description = "Default invoke URL for the staging stage (use this for direct testing)"
  value       = aws_api_gateway_stage.staging.invoke_url
}

output "api_gateway_stage_arn" {
  description = "ARN of the API Gateway staging stage (used for WAF association)"
  value       = aws_api_gateway_stage.staging.arn
}

# ============================================================================
# CUSTOM DOMAIN OUTPUTS (needed for Cloudflare CNAME)
# ============================================================================

output "custom_domain_name" {
  description = "Custom domain name configured on API Gateway"
  value       = aws_api_gateway_domain_name.staging.domain_name
}

output "custom_domain_regional_target" {
  description = "API Gateway regional target hostname. Add as CNAME at Cloudflare for staging.app.bis3ai.com."
  value       = aws_api_gateway_domain_name.staging.regional_domain_name
}

output "custom_domain_regional_zone_id" {
  description = "Hosted zone ID for the API Gateway regional endpoint"
  value       = aws_api_gateway_domain_name.staging.regional_zone_id
}

# ============================================================================
# LAMBDA OUTPUTS
# ============================================================================

output "lambda_frontend_stub_arn" {
  description = "ARN of the frontend stub Lambda function"
  value       = aws_lambda_function.frontend_stub.arn
}

output "lambda_frontend_stub_name" {
  description = "Name of the frontend stub Lambda function"
  value       = aws_lambda_function.frontend_stub.function_name
}

# ============================================================================
# S3 OUTPUTS
# ============================================================================

output "s3_frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend SPA assets (empty until Stage 7)"
  value       = aws_s3_bucket.frontend.id
}

output "s3_frontend_bucket_arn" {
  description = "ARN of the S3 frontend bucket"
  value       = aws_s3_bucket.frontend.arn
}

# ============================================================================
# WAF OUTPUTS
# ============================================================================

output "waf_acl_arn" {
  description = "ARN of the WAFv2 web ACL protecting the frontend"
  value       = aws_wafv2_web_acl.frontend.arn
}

output "waf_acl_id" {
  description = "ID of the WAFv2 web ACL"
  value       = aws_wafv2_web_acl.frontend.id
}
