# infra/backend/outputs.tf
#
# Outputs from the backend module.

# ============================================================================
# VPC OUTPUTS
# ============================================================================

output "vpc_id" {
  description = "VPC ID for the BIS3 Defense backend"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "private_subnet_ids" {
  description = "Private subnet IDs (Lambda placement)"
  value       = aws_subnet.private[*].id
}

output "public_subnet_id" {
  description = "Public subnet ID (NAT Gateway placement)"
  value       = aws_subnet.public.id
}

output "lambda_security_group_id" {
  description = "Security group ID for Lambda functions"
  value       = aws_security_group.lambda.id
}

output "nat_gateway_public_ip" {
  description = "Public IP of NAT Gateway (documented Cognito egress IP for SSP)"
  value       = aws_eip.nat.public_ip
}

# ============================================================================
# API GATEWAY OUTPUTS
# ============================================================================

output "api_gateway_id" {
  description = "ID of the backend REST API Gateway"
  value       = aws_api_gateway_rest_api.backend.id
}

output "api_gateway_invoke_url" {
  description = "Default invoke URL for the staging stage (testing)"
  value       = aws_api_gateway_stage.staging.invoke_url
}

output "api_gateway_stage_arn" {
  description = "ARN of the API Gateway staging stage"
  value       = aws_api_gateway_stage.staging.arn
}

# ============================================================================
# CUSTOM DOMAIN OUTPUTS
# ============================================================================

output "api_custom_domain_name" {
  description = "Custom domain for the backend API"
  value       = aws_api_gateway_domain_name.api_staging.domain_name
}

output "api_custom_domain_regional_target" {
  description = "API Gateway regional hostname. Add as CNAME at Cloudflare for api.staging.app.bis3ai.com"
  value       = aws_api_gateway_domain_name.api_staging.regional_domain_name
}

# ============================================================================
# WAF OUTPUTS
# ============================================================================

output "waf_acl_arn" {
  description = "ARN of the WAFv2 web ACL protecting the backend"
  value       = aws_wafv2_web_acl.backend.arn
}

# ============================================================================
# LAMBDA OUTPUTS
# ============================================================================

output "lambda_auth_function_names" {
  description = "Names of the 13 auth-* Lambda functions"
  value       = [for k, v in aws_lambda_function.auth : v.function_name]
}

output "lambda_admin_function_names" {
  description = "Names of admin-* Lambda functions"
  value       = [for k, v in aws_lambda_function.admin : v.function_name]
}
