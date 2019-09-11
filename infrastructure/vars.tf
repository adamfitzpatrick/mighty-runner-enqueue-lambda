

variable "function_name" {
    description = "Name of lambda function as deployed to AWS"
    default     = "enqueue-lambda"
}

variable "topic_arn" {
    description = "ARN used for restricting lambda access to a specific SNS topic"
    default     = "*"
}

variable "auth_token_field" {
    description = "Name of field in payload which corresponds to the auth token'"
}

variable "object_id_field" {
    description = "Name of the ID field associated with the message payload to be queued for saving"
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