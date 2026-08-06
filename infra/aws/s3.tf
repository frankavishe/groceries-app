# Replaces the local-disk upload fallback (backend/src/uploads/local-disk-upload.adapter.ts)
# in production — no code change needed, just setting AWS_S3_BUCKET/AWS_REGION
# (ecs.tf's task definition) so UploadsModule's factory selects S3UploadAdapter.
resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name_prefix}-uploads"
  tags   = { Name = "${local.name_prefix}-uploads" }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = false # product/category images are served directly to admin-web/mobile — the bucket policy below scopes public GET to the images/ prefix only, not a blanket "block everything" that would also block legitimate reads.
  ignore_public_acls      = true
  restrict_public_buckets = false
}

# Public read on images only (matches the local-disk fallback's current
# behavior — every uploaded image is already served unauthenticated at
# /uploads/*, see main.ts's useStaticAssets). Uploads/writes still require
# the ECS task's IAM credentials (s3.tf's bucket policy grants no public
# write).
resource "aws_s3_bucket_policy" "uploads_public_read" {
  bucket = aws_s3_bucket.uploads.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadImages"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.uploads.arn}/*"
    }]
  })
  depends_on = [aws_s3_bucket_public_access_block.uploads]
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["*"] # image GETs only, per the bucket policy above — same "no CORS restriction needed for public reads" reasoning as specs/hardening/design.md's REST CORS note.
    allowed_headers = ["*"]
  }
}
