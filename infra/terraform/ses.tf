# SES email sending configuration
# Commented out for local development. Uncomment for AWS deployment.

# resource "aws_ses_domain_identity" "main" {
#   count  = var.environment == "local" ? 0 : 1
#   domain = "${var.project_name}.app"
# }
#
# resource "aws_ses_domain_dkim" "main" {
#   count  = var.environment == "local" ? 0 : 1
#   domain = aws_ses_domain_identity.main[0].domain
# }
#
# resource "aws_ses_domain_mail_from" "main" {
#   count       = var.environment == "local" ? 0 : 1
#   domain      = aws_ses_domain_identity.main[0].domain
#   mail_from_domain = "bounce.${var.project_name}.app"
# }
#
# resource "aws_ses_configuration_set" "main" {
#   count  = var.environment == "local" ? 0 : 1
#   name   = "${local.name_prefix}-ses-config"
# }
#
# resource "aws_ses_event_destination" "cloudwatch" {
#   count                  = var.environment == "local" ? 0 : 1
#   name                   = "${local.name_prefix}-ses-events"
#   configuration_set_name = aws_ses_configuration_set.main[0].name
#   enabled                = true
#
#   cloudwatch_destination {
#     default_value  = "sent"
#     dimension_name = "emailType"
#     value_source   = "messageTag"
#   }
# }
#
# resource "aws_iam_policy" "ses_send" {
#   count = var.environment == "local" ? 0 : 1
#   name  = "${local.name_prefix}-ses-send"
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Effect   = "Allow"
#         Actions  = [
#           "ses:SendEmail",
#           "ses:SendRawEmail",
#           "ses:SendTemplatedEmail",
#         ]
#         Resources = ["*"]
#       }
#     ]
#   })
# }
