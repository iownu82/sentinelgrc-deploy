# infra/frontend/versions.tf
#
# Frontend module - GovCloud-only static SPA hosting via API Gateway HTTP API
# (CloudFront is not available in GovCloud, so we use API Gateway as the
# public entry point with a Lambda-served stub for tonight's skeleton.)
#
# State stored separately from foundation/bootstrap modules in the same
# tfstate bucket: frontend/terraform.tfstate

terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  backend "s3" {
    bucket         = "bis3-defense-tfstate"
    key            = "frontend/terraform.tfstate"
    region         = "us-gov-west-1"
    profile        = "govcloud"
    encrypt        = true
    dynamodb_table = "bis3-defense-tfstate-lock"
  }
}
