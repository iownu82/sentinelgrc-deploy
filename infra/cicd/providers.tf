# infra/cicd/providers.tf

provider "aws" {
  region  = "us-gov-west-1"
  profile = "govcloud"

  default_tags {
    tags = {
      Project     = "bis3-defense"
      Environment = "shared"
      ManagedBy   = "terraform"
      Module      = "cicd"
      Compliance  = "FedRAMP-Moderate"
      Owner       = "fredrick.ballard@ballardis3.com"
    }
  }
}

# TLS provider used to fetch GitHub OIDC thumbprint dynamically
provider "tls" {}
