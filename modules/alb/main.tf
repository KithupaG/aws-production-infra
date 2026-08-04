variable "alb_sg" {}
variable "vpc_id" {}
variable "subnet_ids" {}

module "alb" {
  source = "terraform-aws-modules/alb/aws"

  name    = "main-alb"
  vpc_id  = var.vpc_id
  subnets = [var.subnet_ids]

  # Security Group
  security_group_ingress_rules = [var.alb_sg]

  #   access_logs = {
  #     bucket = "my-alb-logs"
  #   }

  listeners = {
    ex-http-https-forward = {
      port     = 80
      protocol = "HTTP"
      forward = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  target_groups = {
    ex-instance = {
      name_prefix = "h1"
      protocol    = "HTTP"
      port        = 80
      target_type = "instance"
      target_id   = "ec2-id"
    }
  }

  tags = {
    Environment = "Dev"
  }
}
