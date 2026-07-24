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

module "dev_sg" {
  source = "../../modules/security"

  vpc_id          = module.dev_app_vpc.vpc_id
  cidr_cidr_block = var.vpc_cidr
  environment     = var.environment
}

module "dev_rds" {
  source = "../../modules/rds"

  security_group = module.dev_sg.main_sg
  subnet_ids     = module.dev_app_vpc.private_subnets
}
