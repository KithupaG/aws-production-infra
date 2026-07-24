variable "security_group" {}
variable "subnet_ids" {}

module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.0"

  identifier = "postgres-db-dev"

  engine            = "postgres"
  engine_version    = "16.3"
  instance_class    = "db.t3a.large"
  allocated_storage = 20

  db_name  = "postgres_db"
  username = "postgres"
  port     = 5432

  iam_database_authentication_enabled = true

  vpc_security_group_ids = [var.security_group]

  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"

  monitoring_interval    = 30
  monitoring_role_name   = "RDSMonitoringRole"
  create_monitoring_role = true

  tags = {
    Owner       = "user"
    Environment = "dev"
  }

  # DB subnet group
  create_db_subnet_group = true
  subnet_ids             = var.subnet_ids

  # DB parameter group
  family = "postgres16"

  # DB option group
  major_engine_version = "16"

  # Database Deletion Protection
  deletion_protection = true

  parameters = [
    {
      name  = "log_connections"
      value = "1"
    },
    {
      name  = "log_disconnections"
      value = "1"
    }
  ]
}
