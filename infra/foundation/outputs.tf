# infra/foundation/outputs.tf
#
# Outputs from the foundation module.

# ============================================================================
# KMS KEY OUTPUTS
# ============================================================================

output "kms_key_id" {
  description = "ID of the BIS3 Defense platform KMS key (UUID format)"
  value       = aws_kms_key.platform.key_id
}

output "kms_key_arn" {
  description = "ARN of the BIS3 Defense platform KMS key"
  value       = aws_kms_key.platform.arn
}

output "kms_alias_name" {
  description = "Human-friendly alias name for the platform KMS key"
  value       = aws_kms_alias.platform.name
}

output "kms_alias_arn" {
  description = "ARN of the KMS alias"
  value       = aws_kms_alias.platform.arn
}

# ============================================================================
# CLOUDWATCH LOG GROUP OUTPUTS
# ============================================================================

output "lambda_log_group_names" {
  description = "Map of Lambda function name to its CloudWatch log group name"
  value       = { for k, v in aws_cloudwatch_log_group.lambda : k => v.name }
}

output "lambda_log_group_arns" {
  description = "Map of Lambda function name to its CloudWatch log group ARN"
  value       = { for k, v in aws_cloudwatch_log_group.lambda : k => v.arn }
}

output "api_gateway_log_group_name" {
  description = "Name of the API Gateway access log group"
  value       = aws_cloudwatch_log_group.api_gateway_access.name
}

output "api_gateway_log_group_arn" {
  description = "ARN of the API Gateway access log group"
  value       = aws_cloudwatch_log_group.api_gateway_access.arn
}

output "application_log_group_name" {
  description = "Name of the cross-cutting application audit log group"
  value       = aws_cloudwatch_log_group.application.name
}

output "application_log_group_arn" {
  description = "ARN of the cross-cutting application audit log group"
  value       = aws_cloudwatch_log_group.application.arn
}

# ============================================================================
# IAM LAMBDA ROLE OUTPUTS
# ============================================================================

output "lambda_auth_role_name" {
  description = "Name of the IAM execution role for auth-* Lambdas"
  value       = aws_iam_role.lambda_auth.name
}

output "lambda_auth_role_arn" {
  description = "ARN of the IAM execution role for auth-* Lambdas"
  value       = aws_iam_role.lambda_auth.arn
}

output "lambda_admin_role_name" {
  description = "Name of the IAM execution role for admin-* Lambdas (privileged)"
  value       = aws_iam_role.lambda_admin.name
}

output "lambda_admin_role_arn" {
  description = "ARN of the IAM execution role for admin-* Lambdas (privileged)"
  value       = aws_iam_role.lambda_admin.arn
}

# ============================================================================
# SECRETS MANAGER OUTPUTS
# ============================================================================

output "secret_rds_master_arn" {
  description = "ARN of the RDS master credentials secret"
  value       = aws_secretsmanager_secret.rds_master.arn
}

output "secret_rds_master_name" {
  description = "Name of the RDS master credentials secret"
  value       = aws_secretsmanager_secret.rds_master.name
}

output "secret_anthropic_api_key_arn" {
  description = "ARN of the Anthropic API key secret"
  value       = aws_secretsmanager_secret.anthropic_api_key.arn
}

output "secret_anthropic_api_key_name" {
  description = "Name of the Anthropic API key secret"
  value       = aws_secretsmanager_secret.anthropic_api_key.name
}

output "secret_csrf_secret_arn" {
  description = "ARN of the CSRF signing secret"
  value       = aws_secretsmanager_secret.csrf_secret.arn
}

output "secret_csrf_secret_name" {
  description = "Name of the CSRF signing secret"
  value       = aws_secretsmanager_secret.csrf_secret.name
}
