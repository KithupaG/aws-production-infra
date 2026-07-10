output "vpc_id" {
    value = module.vpc.vpc_id
    description = "The ID of the VPC created by the module."
}

output "private_subnets" {
    value = module.vpc.private_subnets
    description = "The IDs of the private subnets created by the module."
}

output "public_subnets" {
    value = module.vpc.public_subnets
    description = "The IDs of the public subnets created by the module."
}