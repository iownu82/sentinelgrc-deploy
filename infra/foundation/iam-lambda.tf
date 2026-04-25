# infra/foundation/iam-lambda.tf
#
# IAM execution roles for Lambda functions with separation-of-duties between
# auth flows and privileged admin operations.
#
# Two roles:
#   bis3-defense-lambda-auth   - for auth-* Lambdas (login, MFA, etc.)
#   bis3-defense-lambda-admin  - for admin-* Lambdas (force-password-reset)
#
# Federal compliance:
#   AC-3    Access Enforcement       - Lambda permissions enforced via IAM
#   AC-5    Separation of Duties     - Admin ops isolated to admin role
#   AC-6    Least Privilege          - Each role has only what it needs
#   AC-6(1) Auth to Security Funcs   - Admin perms isolated
#   CM-7    Least Functionality      - No unused permissions
#   AU-2    Audit Events             - Each role logs to specific log groups

# ============================================================================
# SHARED: Trust policy + log group filtering
# ============================================================================

# Trust policy — Lambda service can assume both roles
data "aws_iam_policy_document" "lambda_assume_role" {
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

# Filter our log groups by function class for least-privilege scoping
locals {
  auth_log_group_arns = [
    for k, v in aws_cloudwatch_log_group.lambda : v.arn
    if startswith(k, "auth-")
  ]

  admin_log_group_arns = [
    for k, v in aws_cloudwatch_log_group.lambda : v.arn
    if startswith(k, "admin-")
  ]

  cognito_user_pool_arn = "arn:aws-us-gov:cognito-idp:us-gov-west-1:${data.aws_caller_identity.current.account_id}:userpool/us-gov-west-1_0VaQnbcFH"

  secrets_manager_path_arn = "arn:aws-us-gov:secretsmanager:us-gov-west-1:${data.aws_caller_identity.current.account_id}:secret:bis3-defense/*"
}

# ============================================================================
# AUTH ROLE — for auth-* Lambdas
# ============================================================================

resource "aws_iam_role" "lambda_auth" {
  name               = "bis3-defense-lambda-auth"
  description        = "Execution role for BIS3 Defense authentication Lambdas (login, MFA, logout, etc.)"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name        = "bis3-defense-lambda-auth"
    Description = "Execution role for authentication Lambda functions"
    RoleType    = "lambda-execution"
  }
}

# CloudWatch Logs — only auth log groups + shared application audit log
data "aws_iam_policy_document" "lambda_auth_logs" {
  statement {
    sid    = "AllowAuthLambdasWriteLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = concat(
      [for arn in local.auth_log_group_arns : "${arn}:*"],
      ["${aws_cloudwatch_log_group.application.arn}:*"]
    )
  }
}

resource "aws_iam_role_policy" "lambda_auth_logs" {
  name   = "logs"
  role   = aws_iam_role.lambda_auth.id
  policy = data.aws_iam_policy_document.lambda_auth_logs.json
}

# Cognito user-level operations (NO admin operations)
data "aws_iam_policy_document" "lambda_cognito_user" {
  statement {
    sid    = "AllowCognitoUserOperations"
    effect = "Allow"
    actions = [
      "cognito-idp:InitiateAuth",
      "cognito-idp:RespondToAuthChallenge",
      "cognito-idp:ConfirmSignUp",
      "cognito-idp:GetUser",
      "cognito-idp:ChangePassword",
      "cognito-idp:RevokeToken",
      "cognito-idp:AssociateSoftwareToken",
      "cognito-idp:VerifySoftwareToken",
      "cognito-idp:SetUserMFAPreference",
      "cognito-idp:ForgotPassword",
      "cognito-idp:ConfirmForgotPassword",
      "cognito-idp:GetUserPoolMfaConfig",
      "cognito-idp:DescribeUserPoolClient",
    ]
    resources = [local.cognito_user_pool_arn]
  }
}

resource "aws_iam_role_policy" "lambda_auth_cognito" {
  name   = "cognito-user-ops"
  role   = aws_iam_role.lambda_auth.id
  policy = data.aws_iam_policy_document.lambda_cognito_user.json
}

# KMS decrypt on platform key (for Secrets Manager + envelope keys)
data "aws_iam_policy_document" "lambda_kms_decrypt" {
  statement {
    sid     = "AllowKMSDecryptOnPlatformKey"
    effect  = "Allow"
    actions = ["kms:Decrypt", "kms:DescribeKey"]
    resources = [aws_kms_key.platform.arn]
  }
}

resource "aws_iam_role_policy" "lambda_auth_kms" {
  name   = "kms-decrypt"
  role   = aws_iam_role.lambda_auth.id
  policy = data.aws_iam_policy_document.lambda_kms_decrypt.json
}

# Secrets Manager — only bis3-defense/* secrets
data "aws_iam_policy_document" "lambda_secrets_read" {
  statement {
    sid    = "AllowSecretsManagerReadBis3DefenseSecrets"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = [local.secrets_manager_path_arn]
  }
}

resource "aws_iam_role_policy" "lambda_auth_secrets" {
  name   = "secrets-read"
  role   = aws_iam_role.lambda_auth.id
  policy = data.aws_iam_policy_document.lambda_secrets_read.json
}

# VPC networking permissions (for Lambda-in-VPC, attached now even though
# VPC subnets/config come next session)
resource "aws_iam_role_policy_attachment" "lambda_auth_vpc" {
  role       = aws_iam_role.lambda_auth.name
  policy_arn = "arn:aws-us-gov:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# ============================================================================
# ADMIN ROLE — for admin-* Lambdas (privileged Cognito operations)
# ============================================================================

resource "aws_iam_role" "lambda_admin" {
  name               = "bis3-defense-lambda-admin"
  description        = "Execution role for BIS3 Defense admin Lambdas with privileged Cognito operations (force-password-reset, etc.)"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name        = "bis3-defense-lambda-admin"
    Description = "Execution role for admin Lambda functions"
    RoleType    = "lambda-execution-privileged"
  }
}

# CloudWatch Logs — only admin log groups + shared application audit log
data "aws_iam_policy_document" "lambda_admin_logs" {
  statement {
    sid    = "AllowAdminLambdasWriteLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = concat(
      [for arn in local.admin_log_group_arns : "${arn}:*"],
      ["${aws_cloudwatch_log_group.application.arn}:*"]
    )
  }
}

resource "aws_iam_role_policy" "lambda_admin_logs" {
  name   = "logs"
  role   = aws_iam_role.lambda_admin.id
  policy = data.aws_iam_policy_document.lambda_admin_logs.json
}

# Cognito user-level operations (same as auth role)
resource "aws_iam_role_policy" "lambda_admin_cognito_user" {
  name   = "cognito-user-ops"
  role   = aws_iam_role.lambda_admin.id
  policy = data.aws_iam_policy_document.lambda_cognito_user.json
}

# Cognito ADMIN operations (the privileged extras)
data "aws_iam_policy_document" "lambda_admin_cognito_admin_ops" {
  statement {
    sid    = "AllowCognitoAdminOperations"
    effect = "Allow"
    actions = [
      "cognito-idp:AdminResetUserPassword",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminUpdateUserAttributes",
      "cognito-idp:AdminListGroupsForUser",
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminRemoveUserFromGroup",
      "cognito-idp:AdminDisableUser",
      "cognito-idp:AdminEnableUser",
      "cognito-idp:AdminUserGlobalSignOut",
      "cognito-idp:ListUsers",
      "cognito-idp:ListUsersInGroup",
    ]
    resources = [local.cognito_user_pool_arn]
  }
}

resource "aws_iam_role_policy" "lambda_admin_cognito_admin" {
  name   = "cognito-admin-ops"
  role   = aws_iam_role.lambda_admin.id
  policy = data.aws_iam_policy_document.lambda_admin_cognito_admin_ops.json
}

# KMS (same as auth)
resource "aws_iam_role_policy" "lambda_admin_kms" {
  name   = "kms-decrypt"
  role   = aws_iam_role.lambda_admin.id
  policy = data.aws_iam_policy_document.lambda_kms_decrypt.json
}

# Secrets Manager (same as auth)
resource "aws_iam_role_policy" "lambda_admin_secrets" {
  name   = "secrets-read"
  role   = aws_iam_role.lambda_admin.id
  policy = data.aws_iam_policy_document.lambda_secrets_read.json
}

# VPC networking (same as auth)
resource "aws_iam_role_policy_attachment" "lambda_admin_vpc" {
  role       = aws_iam_role.lambda_admin.name
  policy_arn = "arn:aws-us-gov:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
