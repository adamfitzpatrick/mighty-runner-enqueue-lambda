data "template_file" "lambda_execution_assume_role_policy" {
    template = "${file("${path.module}/policies/lambda-execution-assume-role.template.json")}"
}

data "template_file" "lambda_sns_policy" {
    template = "${file("${path.module}/policies/lambda-sns.template.json")}"

    vars = {
        topic_arn = "${var.topic_arn}"
    }
}

data "template_file" "lambda_cloudwatch_policy" {
    template = "${file("${path.module}/policies/lambda-cloudwatch.template.json")}"

    vars = {
        lambda_name = "${var.function_name}"
    }
}

resource "aws_iam_role" "enqueue-lambda_execution_role" {
    name = "${var.function_name}-execution-role"

    assume_role_policy = "${data.template_file.lambda_execution_assume_role_policy.rendered}"
}

resource "aws_iam_role_policy" "enqueue-lambda_sns_permissions_policy" {
    name   = "${var.function_name}-sns-policy"
    role   = "${aws_iam_role.enqueue-lambda_execution_role.id}"
    policy = "${data.template_file.lambda_sns_policy.rendered}"
}

resource "aws_iam_role_policy" "enqueue-lambda_cloudwatch_permissions_policy" {
    name   = "${var.function_name}-cloudwatch-policy"
    role   = "${aws_iam_role.enqueue-lambda_execution_role.id}"
    policy = "${data.template_file.lambda_cloudwatch_policy.rendered}"
}

resource "aws_lambda_function" "enqueue-lambda_function" {
    filename         = "${path.module}/enqueue-lambda.zip"
    function_name    = "${var.function_name}"
    handler          = "index.handler"
    source_code_hash = "${filebase64sha256("${path.module}/enqueue-lambda.zip")}"
    runtime          = "nodejs8.10"
    role             = "${aws_iam_role.enqueue-lambda_execution_role.arn}"

    environment {
        variables = {
            TOPIC_ARN       = "${var.topic_arn}"
            OBJECT_ID_FIELD = "${var.object_id_field}"
            REGION          = "${var.region}"
        }
    }
}

resource "aws_cloudwatch_log_group" "enqueue-lambda_function" {
  name              = "/aws/lambda/${aws_lambda_function.enqueue-lambda_function.function_name}"
  retention_in_days = "${var.cloudwatch_log_retention_in_days}"
}