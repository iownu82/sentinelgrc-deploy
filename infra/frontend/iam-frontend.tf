# infra/frontend/iam-frontend.tf
#
# IAM execution role for the frontend stub Lambda.
# DELIBERATELY MINIMAL: this Lambda only returns inline HTML, so it only
# needs CloudWatch Logs permissions. No S3, no KMS, no Cognito access.
# Real S3-serving Lambda (Stage 7) will use a separate, scoped role.
#
# Federal compliance:
#   AC-6    Least Privilege - smallest possible permission set
#   CM-7    Least Functionality - no unused permissions
#   AU-2    Audit Events - logs go to dedicated log group

# Trust policy - Lambda service can assume
data "aws_iam_policy_document" "frontend_stub_assume_role" {
  statement {
    sid     = "AllowLambdaServiceAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "frontend_stub" {
  name               = "bis3-defense-frontend-stub"
  description        = "Execution role for the frontend stub Lambda (CloudWatch Logs only)"
  assume_role_policy = data.aws_iam_policy_document.frontend_stub_assume_role.json

  tags = {
    Name        = "bis3-defense-frontend-stub"
    Description = "Execution role for frontend stub Lambda"
    RoleType    = "lambda-execution-stub"
  }
}

# CloudWatch Logs - scoped to its own log group only
data "aws_iam_policy_document" "frontend_stub_logs" {
  statement {
    sid    = "AllowFrontendStubWriteLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = [
      "arn:aws-us-gov:logs:us-gov-west-1:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/bis3-defense-frontend-stub:*",
    ]
  }
}

resource "aws_iam_role_policy" "frontend_stub_logs" {
  name   = "logs"
  role   = aws_iam_role.frontend_stub.id
  policy = data.aws_iam_policy_document.frontend_stub_logs.json
}
