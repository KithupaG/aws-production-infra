module "iam_role" {
  source = "terraform-aws-modules/iam/aws//modules/iam-role"

  name = "app-execution-role"

  trust_policy_permissions = {
    TrustRoleAndServiceToAssume = {
      actions = [
        "sts:AssumeRole",
        "sts:TagSession",
      ]
      principals = [{
        type = "Service"
        identifiers = [
          "ecs-tasks.amazonaws.com",
        ]
      }]
    }
  }

  policies = {
    getSecretsPostgres = "arn:aws:iam::aws:policy/AWSSecretsManagerClientReadOnlyAccess"
    pullImageFromECS   = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  }

  tags = {
    Terraform   = "true"
    Environment = "dev"
  }
}

module "iam_role_task" {
  source = "terraform-aws-modules/iam/aws//modules/iam-role"

  name = "app-task-role"

  trust_policy_permissions = {
    TrustRoleAndServiceToAssume = {
      actions = [
        "sts:AssumeRole",
        "sts:TagSession",
      ]
      principals = [{
        type = "Service"
        identifiers = [
          "ecs-tasks.amazonaws.com",
        ]
      }]
    }
  }

  policies = {

  }

  tags = {
    Terraform   = "true"
    Environment = "dev"
  }
}
