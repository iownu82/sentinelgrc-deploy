# infra/foundation/versions.tf
#
# Terraform + AWS provider version constraints + S3 backend.
# 
# Uses the SAME tfstate bucket as bootstrap but a DIFFERENT key
# (foundation/terraform.tfstate vs bootstrap/terraform.tfstate).
# This keeps Stage 1 and Stage 2 state independent.

terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "bis3-defense-tfstate"
    key            = "foundation/terraform.tfstate"
    region         = "us-gov-west-1"
    profile        = "govcloud"
    encrypt        = true
    dynamodb_table = "bis3-defense-tfstate-lock"
  }
}
