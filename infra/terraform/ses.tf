resource "aws_ses_domain_identity" "meritview" {
  domain = var.ses_domain
}

resource "aws_ses_domain_dkim" "meritview" {
  domain = aws_ses_domain_identity.meritview.domain
}

resource "aws_ses_domain_mail_from" "meritview" {
  domain           = aws_ses_domain_identity.meritview.domain
  mail_from_domain = "bounce.${var.ses_domain}"
}

resource "aws_ses_configuration_set" "meritview" {
  name = "${var.app_name}-${var.environment}-ses-config"

  delivery_options {
    tls_policy = "Require"
  }
}

resource "aws_iam_user" "ses_sender" {
  name = "${var.app_name}-ses-sender-${var.environment}"
  path = "/system/"
}

resource "aws_iam_user_policy" "ses_send" {
  name = "SES-Send-Email"
  user = aws_iam_user.ses_sender.name

  policy = data.aws_iam_policy_document.ses_send.json
}

data "aws_iam_policy_document" "ses_send" {
  statement {
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_access_key" "ses_sender" {
  user = aws_iam_user.ses_sender.name
}
