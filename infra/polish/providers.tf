# infra/polish/providers.tf

provider "aws" {
  region  = "us-gov-west-1"
  profile = "govcloud"

  default_tags {
    tags = {
      Project     = "bis3-defense"
      Environment = "shared"
      ManagedBy   = "terraform"
      Module      = "polish"
      Compliance  = "FedRAMP-Moderate"
      Owner       = "fredrick.ballard@ballardis3.com"
    }
  }
}
