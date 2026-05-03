# infra/backend/lambdas.tf
#
# 14 placeholder Lambda functions for the BIS3 Defense auth API.
# Each returns a JSON response identifying its endpoint - real auth logic
# comes in Stage 6.
#
# IMPORTANT: These Lambdas use foundation module resources via data lookups:
#   - IAM roles: bis3-defense-lambda-auth (13 funcs) + bis3-defense-lambda-admin (1)
#   - Log groups: pre-created KMS-encrypted /aws/lambda/bis3-defense-{name}
#   - VPC: private subnets + lambda security group from this module's vpc.tf
#
# Federal compliance:
#   AC-3    Access Enforcement - VPC isolation + IAM scoping
#   AC-5    Separation of Duties - admin Lambdas use admin role, auth use auth role
#   AC-6    Least Privilege - foundation roles have only required perms
#   CM-2    Baseline Configuration - all 14 Lambdas declarative
#   SC-7    Boundary Protection - Lambdas in private subnets with no IGW
#   SI-7    Software Integrity - source_code_hash in state

# ============================================================================
# INLINE PLACEHOLDER CODE
# ============================================================================

# Single Python file used by all 14 Lambdas. Returns 200 + JSON identifying
# the endpoint via the function name (passed as env var).
data "archive_file" "placeholder_zip" {
  type        = "zip"
  output_path = "${path.module}/.terraform-build/placeholder.zip"

  source {
    filename = "handler.py"
    content  = <<-PYTHON
      """
      BIS3 Defense - Auth API Placeholder Handler
      Returns JSON identifying the endpoint. Real implementation in Stage 6.
      """
      import json
      import os

      ENDPOINT_NAME = os.environ.get("ENDPOINT_NAME", "unknown")

      def handler(event, context):
          """API Gateway REST handler - returns placeholder response."""
          return {
              "statusCode": 200,
              "headers": {
                  "Content-Type": "application/json",
                  "X-Content-Type-Options": "nosniff",
                  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                  "Cache-Control": "no-store",
              },
              "body": json.dumps({
                  "endpoint": ENDPOINT_NAME,
                  "status": "placeholder",
                  "message": f"BIS3 Defense {ENDPOINT_NAME} endpoint - implementation in Stage 6",
                  "stage": "Stage 4 placeholder (Layer 2 deployment)",
              }),
          }
    PYTHON
  }
}

# ============================================================================
# AUTH LAMBDAS (13 functions, use bis3-defense-lambda-auth role)
# ============================================================================

resource "aws_lambda_function" "auth" {
  for_each = toset(local.auth_lambda_names)

  function_name = "bis3-defense-${each.key}"
  description   = "Placeholder for ${each.key} - real implementation in Stage 6"
  role          = data.aws_iam_role.lambda_auth.arn

  filename         = data.archive_file.placeholder_zip.output_path
  source_code_hash = data.archive_file.placeholder_zip.output_base64sha256

  runtime = "python3.12"
  handler = "handler.handler"

  memory_size = 256
  timeout     = 10

  # Layers:
  #  - shared: cookies/responses/jwt_verifier/cognito_client (all auth Lambdas)
  #  - webauthn: py_webauthn lib (only passkey + Cognito CUSTOM_AUTH triggers)
  layers = concat(
    [aws_lambda_layer_version.shared.arn],
    can(regex("passkey|create-challenge|verify-challenge", each.key)) ? [aws_lambda_layer_version.webauthn.arn] : []
  )

  # VPC config - Lambda runs in private subnets
  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Environment - identifies the endpoint
  environment {
    variables = {
      ENDPOINT_NAME            = each.key
      LOG_LEVEL                = "INFO"
      COGNITO_USER_POOL_ID     = local.cognito_user_pool_id
      COGNITO_CLIENT_ID        = local.cognito_client_id
      PASSKEY_TABLE            = aws_dynamodb_table.passkey_credentials.name
      WEBAUTHN_RP_ID           = "localhost"
      WEBAUTHN_RP_NAME         = "BIS3 Defense Dev"
      WEBAUTHN_EXPECTED_ORIGIN = "http://localhost:5173"
    }
  }

  # X-Ray tracing for request flow visibility
  tracing_config {
    mode = "Active"
  }

  tags = {
    Name        = "bis3-defense-${each.key}"
    Description = "Auth Lambda placeholder for ${each.key}"
    Endpoint    = each.key
    Stage       = "stage-4-placeholder"
    LambdaType  = "auth"
  }
}

# ============================================================================
# ADMIN LAMBDAS (1 function, uses bis3-defense-lambda-admin role for SoD)
# ============================================================================

resource "aws_lambda_function" "admin" {
  for_each = toset(local.admin_lambda_names)

  function_name = "bis3-defense-${each.key}"
  description   = "Placeholder for ${each.key} - real implementation in Stage 6 (uses admin role for SoD)"
  role          = data.aws_iam_role.lambda_admin.arn

  filename         = data.archive_file.placeholder_zip.output_path
  source_code_hash = data.archive_file.placeholder_zip.output_base64sha256

  runtime = "python3.12"
  handler = "handler.handler"

  memory_size = 256
  timeout     = 10

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      ENDPOINT_NAME            = each.key
      LOG_LEVEL                = "INFO"
      COGNITO_USER_POOL_ID     = local.cognito_user_pool_id
      COGNITO_CLIENT_ID        = local.cognito_client_id
      PASSKEY_TABLE            = aws_dynamodb_table.passkey_credentials.name
      WEBAUTHN_RP_ID           = "localhost"
      WEBAUTHN_RP_NAME         = "BIS3 Defense Dev"
      WEBAUTHN_EXPECTED_ORIGIN = "http://localhost:5173"
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = {
    Name        = "bis3-defense-${each.key}"
    Description = "Admin Lambda placeholder for ${each.key}"
    Endpoint    = each.key
    Stage       = "stage-4-placeholder"
    LambdaType  = "admin-privileged"
  }
}
