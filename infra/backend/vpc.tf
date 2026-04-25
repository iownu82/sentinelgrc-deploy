# infra/backend/vpc.tf
#
# VPC + 3 private subnets across AZs for Lambda functions.
# NO internet gateway, NO NAT gateway - Lambdas reach AWS services via VPC
# endpoints only (defined in vpc-endpoints.tf). This is the strongest possible
# federal compliance posture: Lambdas have ZERO direct internet access.
#
# Network design:
#   VPC:              10.50.0.0/16   (65,536 IPs)
#   Private subnet 1: 10.50.1.0/24   (us-gov-west-1a, 256 IPs)
#   Private subnet 2: 10.50.2.0/24   (us-gov-west-1b, 256 IPs)
#   Private subnet 3: 10.50.3.0/24   (us-gov-west-1c, 256 IPs)
#   Reserved space:   10.50.4.0/22   (future public subnets if needed)
#   Reserved space:   10.50.16.0/20  (future Stage 9 multi-region peering)
#
# Federal compliance:
#   SC-7    Boundary Protection - VPC isolates compute from internet
#   SC-7(3) Boundary Protection: Access Points - only VPC endpoints, no IGW/NAT
#   SC-7(4) Boundary Protection: External Telecom Services - all egress via private endpoints
#   AC-4    Information Flow Enforcement - route tables control all flow
#   CM-2    Baseline Configuration - VPC config in version control
#   CM-7    Least Functionality - no IGW, no NAT, no public access

# ============================================================================
# VPC
# ============================================================================

resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "bis3-defense-vpc"
    Description = "Private VPC for BIS3 Defense Lambda functions and future RDS peering"
    NetworkType = "private-only"
  }
}

# ============================================================================
# PRIVATE SUBNETS (3 AZs for HA)
# ============================================================================

resource "aws_subnet" "private" {
  count = length(local.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  # CRITICAL: false. These are private subnets - no auto-assigned public IPs.
  map_public_ip_on_launch = false

  tags = {
    Name        = "bis3-defense-private-subnet-${count.index + 1}"
    Description = "Private subnet for Lambda in ${data.aws_availability_zones.available.names[count.index]}"
    SubnetType  = "private"
    Tier        = "compute"
  }
}

# ============================================================================
# ROUTE TABLE (private - no internet routes)
# ============================================================================

# Single shared route table for all private subnets.
# Has NO 0.0.0.0/0 route. The only routes are:
#   - Local VPC routes (added automatically by AWS)
#   - Future routes added by VPC endpoint associations (managed by AWS)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "bis3-defense-private-rt"
    Description = "Private route table - no internet egress, VPC endpoints only"
    RouteType   = "private-only"
  }
}

# Associate each private subnet with the private route table
resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ============================================================================
# SECURITY GROUPS
# ============================================================================

# Security group for Lambda functions
# Egress: HTTPS (443) only, to anywhere within VPC (VPC endpoints handle the rest)
# Ingress: NONE (Lambdas don't accept inbound connections)
resource "aws_security_group" "lambda" {
  name        = "bis3-defense-lambda-sg"
  description = "Security group for backend Lambda functions in private subnets"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name        = "bis3-defense-lambda-sg"
    Description = "Lambda security group - HTTPS egress only"
    SGType      = "lambda-execution"
  }
}

# Egress: HTTPS to anywhere (VPC endpoint policies further restrict the actual destinations)
resource "aws_vpc_security_group_egress_rule" "lambda_https" {
  security_group_id = aws_security_group.lambda.id

  description = "HTTPS egress to VPC endpoints and within VPC"
  cidr_ipv4   = "0.0.0.0/0"
  from_port   = 443
  to_port     = 443
  ip_protocol = "tcp"

  tags = {
    Name = "bis3-defense-lambda-https-egress"
  }
}

# Security group for VPC endpoints (Interface endpoints need a security group)
# Ingress: HTTPS from Lambda security group only
# Egress: NONE explicitly needed (interface endpoints are AWS-managed ENIs)
resource "aws_security_group" "vpc_endpoints" {
  name        = "bis3-defense-vpc-endpoints-sg"
  description = "Security group for AWS service VPC endpoints (Interface type)"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name        = "bis3-defense-vpc-endpoints-sg"
    Description = "VPC endpoints security group - HTTPS from Lambda SG only"
    SGType      = "vpc-endpoint"
  }
}

# Ingress: HTTPS from Lambda security group only
resource "aws_vpc_security_group_ingress_rule" "vpc_endpoints_from_lambda" {
  security_group_id = aws_security_group.vpc_endpoints.id

  description                  = "HTTPS from Lambda functions"
  referenced_security_group_id = aws_security_group.lambda.id
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"

  tags = {
    Name = "bis3-defense-vpc-endpoints-ingress-from-lambda"
  }
}
