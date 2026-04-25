# infra/foundation/providers.tf
#
# AWS provider configuration for GovCloud (us-gov-west-1).
# Default tags identify these resources as part of the foundation module
# (vs bootstrap module).
#
# Federal compliance:
#   CM-2 Baseline Configuration - default tags identify resource ownership
#   CM-8 Information System Component Inventory - tags satisfy inventory tracking
#   AC-2 Account Management - Owner tag ties resources to accountable individual

provider "aws" {
  region  = "us-gov-west-1"
  profile = "govcloud"

  default_tags {
    tags = {
      Project     = "bis3-defense"
      Environment = "shared"
      ManagedBy   = "terraform"
      Module      = "foundation"
      Compliance  = "FedRAMP-Moderate"
      Owner       = "fredrick.ballard@ballardis3.com"
    }
  }
}
