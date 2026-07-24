resource "aws_s3_bucket" "opinion_pdfs" {
  bucket = "${var.project_name}-${var.environment}-opinion-pdfs"

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-opinion-pdfs" })
}

resource "aws_s3_bucket_versioning" "opinion_pdfs" {
  bucket = aws_s3_bucket.opinion_pdfs.id
  versioning_configuration {
    status = var.environment == "production" ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "opinion_pdfs" {
  bucket = aws_s3_bucket.opinion_pdfs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "opinion_pdfs" {
  bucket = aws_s3_bucket.opinion_pdfs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "opinion_pdfs" {
  bucket = aws_s3_bucket.opinion_pdfs.id

  rule {
    id     = "expire-old-pdfs"
    status = "Enabled"

    expiration {
      days = var.environment == "production" ? 2555 : 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_policy" "opinion_pdfs" {
  bucket = aws_s3_bucket.opinion_pdfs.id
  policy = data.aws_iam_policy_document.opinion_pdfs_access.json
}

data "aws_iam_policy_document" "opinion_pdfs_access" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.opinion_pdfs.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.ecs_service.arn]
    }
  }
}
