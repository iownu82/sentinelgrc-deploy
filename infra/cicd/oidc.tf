# infra/cicd/oidc.tf
#
# GitHub Actions OIDC federation to AWS GovCloud.
# Allows GitHub Actions workflows to assume AWS IAM roles WITHOUT
# storing long-lived AWS access keys in GitHub Secrets.
#
# Architecture:
#   GitHub Actions runs -> requests OIDC token -> sts:AssumeRoleWithWebIdentity
#                                                         |
#                                                  Validates against this trust policy
#                                                         |
#                                                  Issues short-lived (1hr) credentials
#                                                         |
#                                                  Workflow deploys to AWS
#
# Two roles for separation of duties:
#   github-actions-frontend-deploy  - S3 sync + frontend Lambda update only
#   github-actions-backend-deploy   - Backend Lambda updates only (14 functions)
#
# Federal compliance:
#   AC-2     Account Management - workflow identity is an "account"
#   AC-3     Access Enforcement - scoped IAM policies
#   AC-5     Separation of Duties - frontend role cannot touch backend, vice versa
#   AC-6     Least Privilege - each role has minimum required permissions
#   AU-2     Audit Events - all role assumptions logged to CloudTrail
#   CM-3     Configuration Change Control - PR-required + audited deploys
#   CM-5     Access Restrictions for Change - only this role can update Lambdas
#   IA-5     Authenticator Management - no long-lived credentials in GitHub
#   SC-12    Cryptographic Key Management - JWT signed by GitHub OIDC

# ============================================================================
# OIDC PROVIDER
# ============================================================================

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]

  tags = {
    Name        = "github-actions-oidc"
    Description = "OIDC provider for GitHub Actions federation to GovCloud"
    Provider    = "github-actions"
  }
}

# ============================================================================
# TRUST POLICY (shared between both roles)
# ============================================================================

# Trust policy: allow GitHub Actions running in this specific repo to assume the role
data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    sid     = "AllowGitHubActionsAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    # Audience must be sts.amazonaws.com
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Subject must match this exact repo
    # Pattern: repo:OWNER/REPO:* (matches all branches, tags, and PRs)
    # Tighten to specific branches in the future if desired:
    # repo:iownu82/csrmfc-ai:ref:refs/heads/main
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_subject_pattern]
    }
  }
}

# ============================================================================
# FRONTEND DEPLOY ROLE
# ============================================================================

resource "aws_iam_role" "frontend_deploy" {
  name               = "github-actions-frontend-deploy"
  description        = "GitHub Actions role for deploying frontend (S3 sync + frontend Lambda update)"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json

  # 1 hour session - matches typical CI/CD job duration
  max_session_duration = 3600

  tags = {
    Name        = "github-actions-frontend-deploy"
    Description = "GitHub Actions frontend deploy role"
    RoleType    = "ci-cd-deploy"
    Scope       = "frontend"
  }
}

# Frontend deploy policy: S3 sync to frontend bucket + frontend Lambda update
data "aws_iam_policy_document" "frontend_deploy" {
  # S3 - sync built React assets to frontend bucket
  statement {
    sid    = "AllowS3SyncToFrontendBucket"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = [data.aws_s3_bucket.frontend_app.arn]
  }

  statement {
    sid    = "AllowS3ObjectOpsInFrontendBucket"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:PutObjectAcl",
    ]
    resources = ["${data.aws_s3_bucket.frontend_app.arn}/*"]
  }

  # Lambda - update frontend stub Lambda code (Stage 7 will replace with real S3-serving Lambda)
  statement {
    sid    = "AllowFrontendLambdaCodeUpdate"
    effect = "Allow"
    actions = [
      "lambda:UpdateFunctionCode",
      "lambda:PublishVersion",
      "lambda:UpdateAlias",
      "lambda:GetFunction",
      "lambda:GetAlias",
      "lambda:ListVersionsByFunction",
    ]
    resources = ["${local.lambda_arn_prefix}:${local.frontend_lambda_name}*"]
  }
}

resource "aws_iam_role_policy" "frontend_deploy" {
  name   = "frontend-deploy-policy"
  role   = aws_iam_role.frontend_deploy.id
  policy = data.aws_iam_policy_document.frontend_deploy.json
}

# ============================================================================
# BACKEND DEPLOY ROLE
# ============================================================================

resource "aws_iam_role" "backend_deploy" {
  name               = "github-actions-backend-deploy"
  description        = "GitHub Actions role for deploying backend Lambdas (14 auth/admin functions)"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json

  max_session_duration = 3600

  tags = {
    Name        = "github-actions-backend-deploy"
    Description = "GitHub Actions backend deploy role"
    RoleType    = "ci-cd-deploy"
    Scope       = "backend"
  }
}

# Backend deploy policy: update Lambda code + manage versions/aliases for 14 backend Lambdas
data "aws_iam_policy_document" "backend_deploy" {
  statement {
    sid    = "AllowBackendLambdaCodeUpdate"
    effect = "Allow"
    actions = [
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "lambda:PublishVersion",
      "lambda:UpdateAlias",
      "lambda:CreateAlias",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:GetAlias",
      "lambda:ListAliases",
      "lambda:ListVersionsByFunction",
    ]
    resources = [
      for name in local.backend_lambda_names :
      "${local.lambda_arn_prefix}:${name}*"
    ]
  }

  # Allow describing functions (broader read - safe, needed for CI checks)
  statement {
    sid       = "AllowLambdaListAndDescribe"
    effect    = "Allow"
    actions   = ["lambda:ListFunctions"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "backend_deploy" {
  name   = "backend-deploy-policy"
  role   = aws_iam_role.backend_deploy.id
  policy = data.aws_iam_policy_document.backend_deploy.json
}
