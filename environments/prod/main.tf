module "prod_app_vpc" {
    source = "../../modules/vpc"

    vpc_name = "prod-app-vpc"
    environment = "prod"
}