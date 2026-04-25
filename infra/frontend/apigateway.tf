# infra/frontend/apigateway.tf
#
# REST API Gateway providing the public entry point for staging.app.bis3ai.com.
# We use REST API (not HTTP API) because WAFv2 only supports REST API stages.
#
# Architecture:
#   Internet → Cloudflare DNS → API Gateway custom domain (TLS) → REST API stage
#                                          ↑
#                                       WAFv2 (REGIONAL scope, attached in waf.tf)
#                                          ↓
#                                       Lambda stub (returns inline HTML)
#
# Federal compliance:
#   SC-7  Boundary Protection - API Gateway is the perimeter
#   AC-3  Access Enforcement - Lambda invocation scoped via IAM permission
#   AU-2  Audit Events - access logs to foundation's pre-created log group
#   SI-4  Information System Monitoring - X-Ray tracing enabled
#   SC-13 Cryptographic Protection - TLS 1.2 minimum for viewer connections

# ============================================================================
# REST API
# ============================================================================

resource "aws_api_gateway_rest_api" "frontend" {
  name        = "bis3-defense-frontend-api"
  description = "REST API for BIS3 Defense staging frontend at staging.app.bis3ai.com"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  depends_on = [aws_api_gateway_account.main]

  tags = {
    Name        = "bis3-defense-frontend-api"
    Description = "Frontend REST API for staging.app.bis3ai.com"
    APIType     = "rest-api"
  }
}

# ============================================================================
# RESOURCES + METHODS - Catch-all proxy pattern
# Any path/method routes to the Lambda stub
# ============================================================================

# /{proxy+} - matches any non-root path
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.frontend.id
  parent_id   = aws_api_gateway_rest_api.frontend.root_resource_id
  path_part   = "{proxy+}"
}

# ANY method on /{proxy+}
resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.frontend.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

# ANY method on / (root path)
resource "aws_api_gateway_method" "root" {
  rest_api_id   = aws_api_gateway_rest_api.frontend.id
  resource_id   = aws_api_gateway_rest_api.frontend.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

# ============================================================================
# LAMBDA INTEGRATIONS
# ============================================================================

resource "aws_api_gateway_integration" "proxy_lambda" {
  rest_api_id = aws_api_gateway_rest_api.frontend.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.frontend_stub.invoke_arn
}

resource "aws_api_gateway_integration" "root_lambda" {
  rest_api_id = aws_api_gateway_rest_api.frontend.id
  resource_id = aws_api_gateway_rest_api.frontend.root_resource_id
  http_method = aws_api_gateway_method.root.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.frontend_stub.invoke_arn
}

# Permission for API Gateway to invoke the Lambda
resource "aws_lambda_permission" "frontend_stub_apigateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.frontend_stub.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.frontend.execution_arn}/*/*"
}

# ============================================================================
# DEPLOYMENT + STAGE
# ============================================================================

resource "aws_api_gateway_deployment" "frontend" {
  rest_api_id = aws_api_gateway_rest_api.frontend.id

  # Re-deploy when any of these resources change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_method.root.id,
      aws_api_gateway_integration.proxy_lambda.id,
      aws_api_gateway_integration.root_lambda.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.proxy_lambda,
    aws_api_gateway_integration.root_lambda,
  ]
}

resource "aws_api_gateway_stage" "staging" {
  deployment_id = aws_api_gateway_deployment.frontend.id
  rest_api_id   = aws_api_gateway_rest_api.frontend.id
  stage_name    = "staging"

  # Access logging to foundation's pre-created log group (KMS-encrypted, 365-day retention)
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

  # X-Ray tracing for request flow visibility (SI-4 monitoring)
  xray_tracing_enabled = true

  depends_on = [aws_api_gateway_account.main]

  tags = {
    Name        = "bis3-defense-frontend-staging-stage"
    Description = "Staging stage for frontend REST API"
    StageType   = "staging"
  }
}

# ============================================================================
# CUSTOM DOMAIN + BASE PATH MAPPING
# ============================================================================

resource "aws_api_gateway_domain_name" "staging" {
  domain_name              = "staging.app.bis3ai.com"
  regional_certificate_arn = aws_acm_certificate_validation.staging.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  # TLS 1.2 minimum (FedRAMP requirement)
  security_policy = "TLS_1_2"

  depends_on = [aws_api_gateway_account.main]

  tags = {
    Name        = "bis3-defense-staging-domain"
    Description = "Custom domain for staging.app.bis3ai.com"
  }
}

resource "aws_api_gateway_base_path_mapping" "staging" {
  api_id      = aws_api_gateway_rest_api.frontend.id
  stage_name  = aws_api_gateway_stage.staging.stage_name
  domain_name = aws_api_gateway_domain_name.staging.domain_name
}
