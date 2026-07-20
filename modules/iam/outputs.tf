output "execution_role_arn" {
  description = "The ARN of the ECS execution role, used by AWS to start the container"
  value       = module.iam_role.arn
}

output "task_role_arn" {
  description = "The ARN of the ECS task role used in the nodejs app"
  value       = module.iam_role_task.arn
}
