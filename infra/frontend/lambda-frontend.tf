# infra/frontend/lambda-frontend.tf
#
# Stub Lambda function that returns inline HTML "BIS3 Defense - Coming Soon".
# Uses archive_file data source to package the Python code inline (no separate
# .py file needed). Real S3-backed Lambda will replace this in Stage 7.
#
# Federal compliance:
#   SI-7    Software, Firmware, Integrity - code is in version control via Terraform
#   CM-2    Baseline Configuration - Lambda config is declarative
#   AC-6    Least Privilege - role grants only CloudWatch Logs
#   AU-9    Protection of Audit Information - logs encrypted via dedicated log group

# ============================================================================
# CLOUDWATCH LOG GROUP for stub Lambda
# ============================================================================

# Note: This log group is in the FRONTEND module, separate from foundation's
# pre-created Lambda log groups. We create it here so the stub Lambda has
# its own dedicated, KMS-encrypted, retention-policy-compliant log group.
resource "aws_cloudwatch_log_group" "frontend_stub" {
  name              = "/aws/lambda/bis3-defense-frontend-stub"
  retention_in_days = 365
  kms_key_id        = data.aws_kms_alias.platform.target_key_arn

  tags = {
    Name        = "bis3-defense-frontend-stub-logs"
    Description = "Logs for frontend stub Lambda"
    LogType     = "lambda"
    Function    = "frontend-stub"
  }
}

# ============================================================================
# LAMBDA SOURCE CODE (inline via archive_file)
# ============================================================================

# Inline Python code packaged on the fly. No separate file on disk.
# The code returns a static HTML page indicating BIS3 Defense is coming soon.
data "archive_file" "frontend_stub_zip" {
  type        = "zip"
  output_path = "${path.module}/.terraform-build/frontend-stub.zip"

  source {
    filename = "handler.py"
    content  = <<-PYTHON
      """
      BIS3 Defense - Frontend Stub Lambda
      Returns a static HTML page until the real SPA is deployed in Stage 7.
      """
      import json

      HTML = """<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>BIS3 Defense - Coming Soon</title>
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
                  color: #ffffff;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 2rem;
              }
              .container {
                  text-align: center;
                  max-width: 600px;
              }
              h1 {
                  font-size: 3rem;
                  margin-bottom: 1rem;
                  background: linear-gradient(90deg, #4a9eff, #00d4ff);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
              }
              .tagline {
                  font-size: 1.25rem;
                  color: #8b95a7;
                  margin-bottom: 2rem;
              }
              .badge {
                  display: inline-block;
                  padding: 0.5rem 1rem;
                  background: rgba(74, 158, 255, 0.1);
                  border: 1px solid #4a9eff;
                  border-radius: 4px;
                  font-size: 0.875rem;
                  color: #4a9eff;
                  margin: 0.25rem;
              }
              .footer {
                  margin-top: 3rem;
                  font-size: 0.75rem;
                  color: #4a5568;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>BIS3 Defense</h1>
              <p class="tagline">DoD CSRMC Compliance Automation Platform</p>
              <div>
                  <span class="badge">SDVOSB</span>
                  <span class="badge">VOSB</span>
                  <span class="badge">FedRAMP-Aligned</span>
                  <span class="badge">DFARS Ready</span>
              </div>
              <div class="footer">
                  Coming Soon - Hosted in AWS GovCloud (us-gov-west-1)
              </div>
          </div>
      </body>
      </html>
      """

      def handler(event, context):
          """API Gateway HTTP API v2 handler."""
          return {
              "statusCode": 200,
              "headers": {
                  "Content-Type": "text/html; charset=utf-8",
                  "Cache-Control": "public, max-age=300",
                  "X-Content-Type-Options": "nosniff",
                  "X-Frame-Options": "DENY",
                  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                  "Referrer-Policy": "strict-origin-when-cross-origin",
              },
              "body": HTML,
          }
    PYTHON
  }
}

# ============================================================================
# LAMBDA FUNCTION
# ============================================================================

resource "aws_lambda_function" "frontend_stub" {
  function_name = "bis3-defense-frontend-stub"
  description   = "Stub Lambda returning placeholder HTML for staging.app.bis3ai.com (replaced in Stage 7)"
  role          = aws_iam_role.frontend_stub.arn

  # Inline package via archive_file data source
  filename         = data.archive_file.frontend_stub_zip.output_path
  source_code_hash = data.archive_file.frontend_stub_zip.output_base64sha256

  # Python 3.12 runtime (latest stable in AWS Lambda)
  runtime = "python3.12"
  handler = "handler.handler"

  # Reasonable defaults for a tiny stub
  memory_size = 128
  timeout     = 5

  # Tracing for observability
  tracing_config {
    mode = "Active"
  }

  # Ensure the log group exists before the function so we don't get
  # auto-created un-encrypted log groups
  depends_on = [
    aws_cloudwatch_log_group.frontend_stub,
    aws_iam_role_policy.frontend_stub_logs,
  ]

  tags = {
    Name        = "bis3-defense-frontend-stub"
    Description = "Frontend stub Lambda for staging deployment"
    Stage       = "stub-replaced-in-stage-7"
  }
}
