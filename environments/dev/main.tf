module "dev_app_vpc" {
  source = "../../modules/vpc"

  vpc_cidr            = var.vpc_cidr
  environment         = var.environment
  public_subnet_cidr  = var.public_subnet_cidr
  private_subnet_cidr = var.private_subnet_cidr
}

output "dev_vpc_id" {
  value = module.dev_app_vpc.vpc_id
}
