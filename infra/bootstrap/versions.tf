# infra/bootstrap/versions.tf
#
# Provider and Terraform version constraints.
# Pinned conservatively for reproducibility and auditor predictability.
#
# Federal compliance:
#   CM-3 Configuration Change Control - explicit version pinning required
#   CM-6 Configuration Settings - declarative, reproducible config

terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3 backend for remote state.
  # The bucket and DynamoDB table were created on the first apply with local state.
  # After this block was added, `terraform init -migrate-state` was used to move
  # state from local terraform.tfstate to s3://bis3-defense-tfstate/bootstrap/terraform.tfstate
  #
  # Federal compliance:
  #   AU-9 Protection of Audit Information - state is encrypted in S3
  #   SC-28 Protection of Information at Rest - AES256
  #   CP-9 Information System Backup - S3 versioning enabled
  #   CM-2 Baseline Configuration - state is the baseline
  backend "s3" {
    bucket         = "bis3-defense-tfstate"
    key            = "bootstrap/terraform.tfstate"
    region         = "us-gov-west-1"
    profile        = "govcloud"
    encrypt        = true
    dynamodb_table = "bis3-defense-tfstate-lock"
  }
}
