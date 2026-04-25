# infra/backend/vpc-endpoints.tf
#
# VPC endpoints let Lambdas reach AWS services without leaving the VPC.
# Without these, Lambdas in private subnets (with no NAT) cannot reach
# Cognito, Secrets Manager, KMS, CloudWatch Logs, or S3 - they would just
# fail to make API calls.
#
# Endpoint types:
#   Gateway endpoints (free, route-table-based): S3
#   Interface endpoints (~$7.20/mo + data, ENI-based): Cognito, Secrets Mgr, KMS, Logs
#
# Cost: ~$22-30/month total (4 interface endpoints x $7.20 + minor data)
#
# Federal compliance:
#   SC-7    Boundary Protection - all AWS API calls stay on AWS backbone
#   SC-7(4) Boundary Protection: External Telecom Services - no public internet
#   SC-7(5) Boundary Protection: Deny-by-default - no IGW, no NAT
#   AC-4    Information Flow Enforcement - explicit per-service endpoints

# ============================================================================
# S3 - Gateway endpoint (FREE)
# ============================================================================

# Gateway endpoint adds a route to the VPC route table that sends S3 traffic
# directly to S3 over the AWS backbone. No ENI, no charges, no security group.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-gov-west-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Name         = "bis3-defense-vpce-s3"
    Description  = "Gateway endpoint for S3 access from private subnets"
    EndpointType = "gateway"
    Service      = "s3"
  }
}

# ============================================================================

# ============================================================================
# SECRETS MANAGER - Interface endpoint
# ============================================================================

resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-gov-west-1.secretsmanager"
  vpc_endpoint_type = "Interface"

  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name         = "bis3-defense-vpce-secretsmanager"
    Description  = "Interface endpoint for Secrets Manager"
    EndpointType = "interface"
    Service      = "secretsmanager"
  }
}

# ============================================================================
# KMS - Interface endpoint
# ============================================================================

resource "aws_vpc_endpoint" "kms" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-gov-west-1.kms"
  vpc_endpoint_type = "Interface"

  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name         = "bis3-defense-vpce-kms"
    Description  = "Interface endpoint for KMS (decrypt secrets, generate data keys)"
    EndpointType = "interface"
    Service      = "kms"
  }
}

# ============================================================================
# CLOUDWATCH LOGS - Interface endpoint
# ============================================================================

resource "aws_vpc_endpoint" "logs" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-gov-west-1.logs"
  vpc_endpoint_type = "Interface"

  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name         = "bis3-defense-vpce-logs"
    Description  = "Interface endpoint for CloudWatch Logs (Lambda log delivery)"
    EndpointType = "interface"
    Service      = "logs"
  }
}
