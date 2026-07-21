variable "vpc_id" {}
variable "cidr_cidr_block" {}
variable "environment" {}

resource "aws_security_group" "ap_sg" {
  name        = "app_security_group"
  description = "Security group for the task manager application"
  vpc_id      = var.vpc_id

  tags = {
    Name        = "allow_tls_ssh"
    Environment = var.environment
  }
}

resource "aws_vpc_security_group_ingress_rule" "application_frontend" {
  security_group_id = aws_security_group.ap_sg.id
  cidr_ipv4         = var.cidr_cidr_block
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "allow_SSH" {
  security_group_id = aws_security_group.ap_sg.id
  cidr_ipv4         = var.cidr_cidr_block
  from_port         = 22
  ip_protocol       = "tcp"
  to_port           = 22
}

resource "aws_vpc_security_group_ingress_rule" "allow_backend_access" {
  security_group_id = aws_security_group.ap_sg.id
  cidr_ipv4         = var.cidr_cidr_block
  from_port         = 5000
  ip_protocol       = "tcp"
  to_port           = 5000
}

resource "aws_vpc_security_group_ingress_rule" "allow_database_access" {
  security_group_id = aws_security_group.ap_sg.id
  cidr_ipv4         = var.cidr_cidr_block
  from_port         = 5432
  ip_protocol       = "tcp"
  to_port           = 5432
}


resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
  security_group_id = aws_security_group.ap_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
