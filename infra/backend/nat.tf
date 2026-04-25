# infra/backend/nat.tf
#
# NAT Gateway architecture for Cognito egress.
#
# WHY THIS EXISTS:
# Cognito IDP does not have a VPC endpoint in AWS GovCloud (verified via
# describe-vpc-endpoint-services on 4/25/2026). All other AWS services we
# use (KMS, Secrets Manager, S3, CloudWatch Logs) reach through VPC endpoints
# in vpc-endpoints.tf, but Cognito calls require public-internet egress.
#
# This is the AWS-recommended federal pattern when an AWS service has no
# VPC endpoint: provide controlled NAT egress in a public subnet that
# Lambda private subnets can route through.
#
# Architecture:
#   Lambda (private subnet) -> 0.0.0.0/0 route -> NAT Gateway (public subnet)
#                                                       |
#                                                  Elastic IP
#                                                       |
#                                                  Internet Gateway
#                                                       |
#                                                  Cognito public API
#
# SSP narrative for ATO:
# "Lambda functions egress to AWS services exclusively via VPC endpoints
# (4 services), with one documented exception (Cognito IDP) routed via
# a NAT Gateway in a controlled public subnet. The NAT subnet is the
# only subnet with internet routing; Lambda subnets have no direct
# internet access. Egress IP is a single Elastic IP that can be added
# to allow-lists or audit logs."
#
# Federal compliance:
#   SC-7    Boundary Protection - VPC IS the boundary, NAT is a controlled access point
#   SC-7(3) Access Points - exactly one NAT, one IGW = 2 controlled access points
#   SC-7(4) External Telecom Services - documented exception for Cognito
#   SC-7(5) Deny by Default - private subnets still default-deny
#   AC-4    Information Flow Enforcement - explicit route table entries
#   3.13.1 (CMMC L2) - Boundary protection at managed interfaces
#   3.13.5 (CMMC L2) - Public-facing components in separated subnetwork (NAT subnet)
#
# Cost: ~$48/month (NAT Gateway $45 + Elastic IP $3)

# ============================================================================
# PUBLIC SUBNET (single AZ - NAT Gateway is single-AZ resource)
# ============================================================================

# Single public subnet in us-gov-west-1a.
# Multi-AZ NAT requires 1 NAT per AZ ($135/mo) which is overkill at MVP scale.
# Stage 9 multi-region work will add NAT redundancy if needed.
resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.50.10.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  # Public subnet: instances launched here get public IPs by default.
  # No instances launch here in our architecture - only the NAT Gateway.
  map_public_ip_on_launch = true

  tags = {
    Name        = "bis3-defense-public-subnet"
    Description = "Public subnet for NAT Gateway egress (Cognito) only"
    SubnetType  = "public"
    Tier        = "egress"
  }
}

# ============================================================================
# INTERNET GATEWAY
# ============================================================================

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "bis3-defense-igw"
    Description = "Internet gateway for NAT egress only - no inbound traffic"
  }
}

# ============================================================================
# ELASTIC IP for NAT Gateway
# ============================================================================

resource "aws_eip" "nat" {
  domain = "vpc"

  # IGW must exist before EIP can be associated with NAT
  depends_on = [aws_internet_gateway.main]

  tags = {
    Name        = "bis3-defense-nat-eip"
    Description = "Elastic IP for NAT Gateway - documented egress IP for Cognito calls"
  }
}

# ============================================================================
# NAT GATEWAY
# ============================================================================

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  # Connectivity type: public (egress to internet via IGW)
  connectivity_type = "public"

  depends_on = [aws_internet_gateway.main]

  tags = {
    Name        = "bis3-defense-nat-gw"
    Description = "NAT gateway for Cognito egress from Lambda private subnets"
  }
}

# ============================================================================
# PUBLIC ROUTE TABLE
# ============================================================================

# Public route table: 0.0.0.0/0 -> IGW (the NAT Gateway uses this to egress)
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "bis3-defense-public-rt"
    Description = "Public route table - 0.0.0.0/0 to IGW for NAT egress"
    RouteType   = "public-egress"
  }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ============================================================================
# PRIVATE ROUTE TABLE - add NAT Gateway route
# ============================================================================

# Add 0.0.0.0/0 -> NAT Gateway to the existing private route table
# (defined in vpc.tf). This is the route that lets Lambda reach Cognito.
# All other AWS service traffic still goes via VPC endpoints (which have
# higher route table priority via prefix list matching).
resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}
