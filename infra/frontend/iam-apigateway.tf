# infra/frontend/iam-apigateway.tf
#
# Account-level IAM role allowing API Gateway to push logs to CloudWatch.
# AWS requires this to be registered via aws_api_gateway_account before
# any API Gateway stage can have access logging enabled.
#
# This is a per-AWS-account, one-time setup. Once registered, it applies
# to all API Gateway APIs in this account.
#
# Federal compliance:
#   AU-2  Audit Events - enables stage access logs
#   AU-9  Protection of Audit Information - logs go to KMS-encrypted log groups

data "aws_iam_policy_document" "apigateway_cloudwatch_assume_role" {
  statement {
    sid     = "AllowAPIGatewayAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apigateway_cloudwatch" {
  name               = "bis3-defense-apigateway-cloudwatch"
  description        = "Account-level role allowing API Gateway to push access logs to CloudWatch"
  assume_role_policy = data.aws_iam_policy_document.apigateway_cloudwatch_assume_role.json

  tags = {
    Name        = "bis3-defense-apigateway-cloudwatch"
    Description = "API Gateway CloudWatch Logs role"
    RoleType    = "service-role"
  }
}

# Attach the AWS-managed policy that grants log push permissions
resource "aws_iam_role_policy_attachment" "apigateway_cloudwatch" {
  role       = aws_iam_role.apigateway_cloudwatch.name
  policy_arn = "arn:aws-us-gov:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Register this role with API Gateway at the account level.
# This is account-scoped, not API-scoped - it applies to ALL API Gateway APIs
# in this AWS account/region.
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.apigateway_cloudwatch.arn
}
