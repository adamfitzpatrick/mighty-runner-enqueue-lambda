

variable "function_name" {
    description = "Name of lambda function as deployed to AWS"
    default     = "get-lambda"
}

variable "topic_arn" {
    description = "ARN used for restricting lambda access to a specific dynamo table"
    default     = "*"
}

variable "object_id_field" {
    description = "Sort key name for the DynamoDB source table"
    default     = ""
}

variable "region" {
    description = "AWS region"
    default     = "us-west-2"
}

variable "cloudwatch_log_retention_in_days" {
    description = "Amount of time to retain log data"
    default     = "365"
}