# infra/cicd/outputs.tf
#
# Outputs from the CI/CD module.
# These are consumed by GitHub Actions workflow YAML files.

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub Actions OIDC provider in IAM"
  value       = aws_iam_openid_connect_provider.github.arn
}

output "frontend_deploy_role_arn" {
  description = "ARN of the IAM role GitHub Actions assumes for frontend deploys. Use in deploy-frontend.yml workflow."
  value       = aws_iam_role.frontend_deploy.arn
}

output "backend_deploy_role_arn" {
  description = "ARN of the IAM role GitHub Actions assumes for backend deploys. Use in deploy-backend.yml workflow."
  value       = aws_iam_role.backend_deploy.arn
}

output "github_repo_path" {
  description = "GitHub repo identifier the deploy roles trust"
  value       = "${local.github_org}/${local.github_repo}"
}

output "deployable_backend_lambdas" {
  description = "List of backend Lambda names the backend-deploy role can update"
  value       = local.backend_lambda_names
}

output "deployable_frontend_lambda" {
  description = "Frontend Lambda the frontend-deploy role can update"
  value       = local.frontend_lambda_name
}
