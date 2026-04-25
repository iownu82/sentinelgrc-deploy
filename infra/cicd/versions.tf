# infra/cicd/versions.tf
#
# CI/CD module - GitHub Actions OIDC federation to GovCloud + deploy roles.
# Module 5 of v1.10. Enables `git push` -> Lambda update + S3 sync.
#
# State stored separately: cicd/terraform.tfstate

terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "bis3-defense-tfstate"
    key            = "cicd/terraform.tfstate"
    region         = "us-gov-west-1"
    profile        = "govcloud"
    encrypt        = true
    dynamodb_table = "bis3-defense-tfstate-lock"
  }
}
