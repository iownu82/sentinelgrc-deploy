# infra/backend/providers.tf
#
# AWS provider for GovCloud (us-gov-west-1).
# Module="backend" tag distinguishes these resources from frontend/foundation/bootstrap.

provider "aws" {
  region  = "us-gov-west-1"
  profile = "govcloud"

  default_tags {
    tags = {
      Project     = "bis3-defense"
      Environment = "staging"
      ManagedBy   = "terraform"
      Module      = "backend"
      Compliance  = "FedRAMP-Moderate"
      Owner       = "fredrick.ballard@ballardis3.com"
    }
  }
}
