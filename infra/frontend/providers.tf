# infra/frontend/providers.tf
#
# AWS provider for GovCloud (us-gov-west-1).
# Note: Environment="staging" (vs foundation's "shared") since this module
# specifically deploys to the staging.app.bis3ai.com subdomain.

provider "aws" {
  region  = "us-gov-west-1"
  profile = "govcloud"

  default_tags {
    tags = {
      Project     = "bis3-defense"
      Environment = "staging"
      ManagedBy   = "terraform"
      Module      = "frontend"
      Compliance  = "FedRAMP-Moderate"
      Owner       = "fredrick.ballard@ballardis3.com"
    }
  }
}
