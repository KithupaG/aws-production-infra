output "main_sg" {
  description = "Main sg for the application to access tls, ssh, and allow all outbound connections"
  value       = aws_security_group.ap_sg.id
}

output "vpc_cidr_output" {
  description = "Outputs cidr value for vpc"
  value       = aws_security_group.ap_sg.vpc_cidr_block
}
