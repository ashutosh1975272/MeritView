resource "aws_s3_bucket" "opinion_pdfs" {
  bucket        = "${var.s3_bucket_name_prefix}-opinion-pdfs-${var.environment}"
  force_destroy = var.environment != "production"

  tags = {
    Name = "${var.app_name}-opinion-pdfs-${var.environment}"
  }
}

resource "aws_s3_bucket_versioning" "opinion_pdfs" {
  bucket = aws_s3_bucket.opinion_pdfs.id
  versioning_configuration {
    status = "Enabled"
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
      days = 365
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket_policy" "opinion_pdfs" {
  bucket = aws_s3_bucket.opinion_pdfs.id
  policy = data.aws_iam_policy_document.opinion_pdfs.json
}

data "aws_iam_policy_document" "opinion_pdfs" {
  statement {
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions   = ["s3:*"]
    resources = [
      aws_s3_bucket.opinion_pdfs.arn,
      "${aws_s3_bucket.opinion_pdfs.arn}/*",
    ]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}
