# infra/backend/apigateway.tf
#
# REST API Gateway for api.staging.app.bis3ai.com.
# 14 routes wired to 14 Lambda placeholders. Custom domain + base path mapping.
# Account-level CloudWatch Logs role was registered in frontend module - reused here.
#
# Federal compliance:
#   SC-7  Boundary Protection - API Gateway is the public perimeter
#   AC-3  Access Enforcement - Lambda invocation via IAM permission
#   AU-2  Audit Events - access logs to KMS-encrypted log group (foundation module)
#   SI-4  Information System Monitoring - X-Ray tracing
#   SC-13 Cryptographic Protection - TLS 1.2+ minimum

# ============================================================================
# REST API
# ============================================================================

resource "aws_api_gateway_rest_api" "backend" {
  name        = "bis3-defense-backend-api"
  description = "REST API for BIS3 Defense auth backend at api.staging.app.bis3ai.com"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "bis3-defense-backend-api"
    Description = "Backend REST API for api.staging.app.bis3ai.com"
    APIType     = "rest-api"
  }
}

# ============================================================================
# ROUTE STRUCTURE
# ============================================================================

# Endpoint configuration: each function name maps to its API Gateway path + method
locals {
  endpoint_routes = {
    "auth-login"                    = { path = "auth/login",                    method = "POST", lambda_type = "auth" }
    "auth-mfa"                      = { path = "auth/mfa",                      method = "POST", lambda_type = "auth" }
    "auth-logout"                   = { path = "auth/logout",                   method = "POST", lambda_type = "auth" }
    "auth-refresh"                  = { path = "auth/refresh",                  method = "POST", lambda_type = "auth" }
    "auth-me"                       = { path = "auth/me",                       method = "GET",  lambda_type = "auth" }
    "auth-setup-password"           = { path = "auth/setup-password",           method = "POST", lambda_type = "auth" }
    "auth-setup-mfa"                = { path = "auth/setup-mfa",                method = "POST", lambda_type = "auth" }
    "auth-forgot-password"          = { path = "auth/forgot-password",          method = "POST", lambda_type = "auth" }
    "auth-reset-password"           = { path = "auth/reset-password",           method = "POST", lambda_type = "auth" }
    "auth-passkey-register-options" = { path = "auth/passkey/register-options", method = "POST", lambda_type = "auth" }
    "auth-passkey-register-verify"  = { path = "auth/passkey/register-verify",  method = "POST", lambda_type = "auth" }
    "auth-passkey-auth-options"     = { path = "auth/passkey/auth-options",     method = "POST", lambda_type = "auth" }
    "auth-passkey-auth-verify"      = { path = "auth/passkey/auth-verify",      method = "POST", lambda_type = "auth" }
    "admin-force-password-reset"    = { path = "admin/force-password-reset",    method = "POST", lambda_type = "admin" }
  }

  # All Lambda functions keyed by name for cross-reference
  all_lambdas = merge(
    { for k, v in aws_lambda_function.auth : k => v },
    { for k, v in aws_lambda_function.admin : k => v },
  )
}

# ============================================================================
# RESOURCES (path segments)
# ============================================================================

# /auth - top-level
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.backend.id
  parent_id   = aws_api_gateway_rest_api.backend.root_resource_id
  path_part   = "auth"
}

# /admin - top-level
resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.backend.id
  parent_id   = aws_api_gateway_rest_api.backend.root_resource_id
  path_part   = "admin"
}

# /auth/passkey - intermediate path for passkey/* endpoints
resource "aws_api_gateway_resource" "passkey" {
  rest_api_id = aws_api_gateway_rest_api.backend.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "passkey"
}

# Leaf resources - one per endpoint, parented to /auth, /admin, or /auth/passkey
resource "aws_api_gateway_resource" "endpoint" {
  for_each = local.endpoint_routes

  rest_api_id = aws_api_gateway_rest_api.backend.id

  # Parent depends on path structure
  parent_id = (
    startswith(each.value.path, "auth/passkey/") ? aws_api_gateway_resource.passkey.id :
    startswith(each.value.path, "auth/")         ? aws_api_gateway_resource.auth.id    :
    startswith(each.value.path, "admin/")        ? aws_api_gateway_resource.admin.id   :
    aws_api_gateway_rest_api.backend.root_resource_id
  )

  # Last segment of the path
  path_part = element(split("/", each.value.path), length(split("/", each.value.path)) - 1)
}

# ============================================================================
# METHODS + LAMBDA INTEGRATIONS
# ============================================================================

resource "aws_api_gateway_method" "endpoint" {
  for_each = local.endpoint_routes

  rest_api_id   = aws_api_gateway_rest_api.backend.id
  resource_id   = aws_api_gateway_resource.endpoint[each.key].id
  http_method   = each.value.method
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "endpoint" {
  for_each = local.endpoint_routes

  rest_api_id = aws_api_gateway_rest_api.backend.id
  resource_id = aws_api_gateway_resource.endpoint[each.key].id
  http_method = aws_api_gateway_method.endpoint[each.key].http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = local.all_lambdas[each.key].invoke_arn
}

# Lambda invoke permissions (one per endpoint)
resource "aws_lambda_permission" "endpoint" {
  for_each = local.endpoint_routes

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = local.all_lambdas[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.backend.execution_arn}/*/*"
}

# ============================================================================
# DEPLOYMENT + STAGE
# ============================================================================

resource "aws_api_gateway_deployment" "backend" {
  rest_api_id = aws_api_gateway_rest_api.backend.id

  triggers = {
    redeployment = sha1(jsonencode([
      [for k, v in aws_api_gateway_resource.endpoint : v.id],
      [for k, v in aws_api_gateway_method.endpoint : v.id],
      [for k, v in aws_api_gateway_integration.endpoint : v.id],
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.endpoint,
  ]
}

resource "aws_api_gateway_stage" "staging" {
  deployment_id = aws_api_gateway_deployment.backend.id
  rest_api_id   = aws_api_gateway_rest_api.backend.id
  stage_name    = "staging"

  access_log_settings {
    destination_arn = "arn:aws-us-gov:logs:us-gov-west-1:${data.aws_caller_identity.current.account_id}:log-group:/aws/apigateway/bis3-defense-api"
    format = jsonencode({
      requestId          = "$context.requestId"
      ip                 = "$context.identity.sourceIp"
      requestTime        = "$context.requestTime"
      httpMethod         = "$context.httpMethod"
      resourcePath       = "$context.resourcePath"
      status             = "$context.status"
      protocol           = "$context.protocol"
      responseLength     = "$context.responseLength"
      integrationLatency = "$context.integration.latency"
      userAgent          = "$context.identity.userAgent"
    })
  }

  xray_tracing_enabled = true

  tags = {
    Name        = "bis3-defense-backend-staging-stage"
    Description = "Staging stage for backend REST API"
    StageType   = "staging"
  }
}

# ============================================================================
# CUSTOM DOMAIN + BASE PATH MAPPING
# ============================================================================

resource "aws_api_gateway_domain_name" "api_staging" {
  domain_name              = "api.staging.app.bis3ai.com"
  regional_certificate_arn = aws_acm_certificate_validation.api.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  security_policy = "TLS_1_2"

  tags = {
    Name        = "bis3-defense-api-staging-domain"
    Description = "Custom domain for api.staging.app.bis3ai.com"
  }
}

resource "aws_api_gateway_base_path_mapping" "api_staging" {
  api_id      = aws_api_gateway_rest_api.backend.id
  stage_name  = aws_api_gateway_stage.staging.stage_name
  domain_name = aws_api_gateway_domain_name.api_staging.domain_name
}
