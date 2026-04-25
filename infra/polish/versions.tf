# infra/polish/versions.tf
#
# Polish module - federal compliance enhancements:
#   - WAF logging via Kinesis Firehose to CloudWatch
#   - AWS Config continuous compliance monitoring
#   - GuardDuty threat detection
#
# State stored separately: polish/terraform.tfstate

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
    key            = "polish/terraform.tfstate"
    region         = "us-gov-west-1"
    profile        = "govcloud"
    encrypt        = true
    dynamodb_table = "bis3-defense-tfstate-lock"
  }
}
