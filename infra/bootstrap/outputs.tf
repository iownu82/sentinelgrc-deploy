# infra/bootstrap/outputs.tf
#
# Outputs from the bootstrap module.
# These values will be referenced by other Terraform modules to configure
# their remote state backends.

output "tfstate_bucket_name" {
  description = "Name of the S3 bucket storing Terraform state"
  value       = aws_s3_bucket.tfstate.id
}

output "tfstate_bucket_arn" {
  description = "ARN of the S3 bucket storing Terraform state"
  value       = aws_s3_bucket.tfstate.arn
}

output "tfstate_lock_table_name" {
  description = "Name of the DynamoDB table for Terraform state locking"
  value       = aws_dynamodb_table.tfstate_lock.name
}

output "tfstate_lock_table_arn" {
  description = "ARN of the DynamoDB table for Terraform state locking"
  value       = aws_dynamodb_table.tfstate_lock.arn
}
