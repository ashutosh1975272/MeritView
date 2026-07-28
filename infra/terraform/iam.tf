resource "aws_iam_role" "app" {
  name = "${var.app_name}-${var.environment}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-app-role-${var.environment}"
  }
}

resource "aws_iam_role_policy" "app_s3" {
  name = "${var.app_name}-s3-access-${var.environment}"
  role = aws_iam_role.app.id

  policy = data.aws_iam_policy_document.app_s3.json
}

data "aws_iam_policy_document" "app_s3" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.opinion_pdfs.arn,
      "${aws_s3_bucket.opinion_pdfs.arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "app_ses" {
  name = "${var.app_name}-ses-send-${var.environment}"
  role = aws_iam_role.app.id

  policy = data.aws_iam_policy_document.app_ses.json
}

data "aws_iam_policy_document" "app_ses" {
  statement {
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "app_cloudwatch" {
  name = "${var.app_name}-cloudwatch-${var.environment}"
  role = aws_iam_role.app.id

  policy = data.aws_iam_policy_document.app_cloudwatch.json
}

data "aws_iam_policy_document" "app_cloudwatch" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.app_name}-${var.environment}-app-profile"
  role = aws_iam_role.app.name
}
