# infra/bootstrap/providers.tf
#
# AWS provider configuration for GovCloud (us-gov-west-1).
# Uses the named profile "govcloud" configured via:
#   aws configure --profile govcloud
#
# Federal compliance:
#   CM-2 Baseline Configuration - default tags identify resource ownership
#   CM-8 Information System Component Inventory - tags satisfy inventory tracking
#   AC-2 Account Management - Owner tag ties resources to accountable individual

provider "aws" {
  region  = "us-gov-west-1"
  profile = "govcloud"

  # Default tags applied automatically to every AWS resource Terraform creates.
  # Federal auditors will look at every resource and ask: who owns this, what
  # project is it for, what compliance regime applies? These tags answer all
  # three questions at the resource level, dramatically simplifying ATO assessments.
  default_tags {
    tags = {
      Project     = "bis3-defense"
      Environment = "shared"
      ManagedBy   = "terraform"
      Module      = "bootstrap"
      Compliance  = "FedRAMP-Moderate"
      Owner       = "fredrick.ballard@ballardis3.com"
    }
  }
}
