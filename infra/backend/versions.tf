# infra/backend/versions.tf
#
# Backend module - Auth API at api.staging.app.bis3ai.com
# REST API Gateway + 14 placeholder Lambdas in private VPC subnets with VPC endpoints.
#
# State stored separately from other modules:
#   bootstrap/terraform.tfstate    (S3 + DynamoDB lock infrastructure)
#   foundation/terraform.tfstate   (KMS, log groups, IAM roles, secrets)
#   frontend/terraform.tfstate     (staging.app.bis3ai.com SPA hosting)
#   backend/terraform.tfstate      (this module - api.staging.app.bis3ai.com)

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
    key            = "backend/terraform.tfstate"
    region         = "us-gov-west-1"
    profile        = "govcloud"
    encrypt        = true
    dynamodb_table = "bis3-defense-tfstate-lock"
  }
}
