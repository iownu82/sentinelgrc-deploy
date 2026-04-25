# infra/polish/outputs.tf

# WAF logging outputs
output "waf_frontend_log_group_arn" {
  description = "CloudWatch log group for frontend WAF"
  value       = aws_cloudwatch_log_group.waf_frontend.arn
}

output "waf_backend_log_group_arn" {
  description = "CloudWatch log group for backend WAF"
  value       = aws_cloudwatch_log_group.waf_backend.arn
}

# AWS Config outputs
output "config_recorder_name" {
  description = "Name of the AWS Config recorder"
  value       = aws_config_configuration_recorder.main.name
}

output "config_s3_bucket" {
  description = "S3 bucket where AWS Config delivers snapshots"
  value       = aws_s3_bucket.config.id
}

output "config_role_arn" {
  description = "IAM role ARN used by AWS Config"
  value       = aws_iam_role.config.arn
}

output "config_rules" {
  description = "List of active AWS Config managed rules"
  value = [
    aws_config_config_rule.encrypted_volumes.name,
    aws_config_config_rule.iam_password_policy.name,
    aws_config_config_rule.s3_no_public_read.name,
    aws_config_config_rule.s3_no_public_write.name,
    aws_config_config_rule.s3_versioning.name,
    aws_config_config_rule.rds_encrypted.name,
    aws_config_config_rule.cloudtrail_enabled.name,
  ]
}

# GuardDuty outputs
output "guardduty_detector_id" {
  description = "GuardDuty detector ID"
  value       = aws_guardduty_detector.main.id
}

output "guardduty_finding_publishing_frequency" {
  description = "How often GuardDuty publishes findings"
  value       = aws_guardduty_detector.main.finding_publishing_frequency
}
