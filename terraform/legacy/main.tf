terraform {
  backend "s3" {
    bucket         = "hyperbola-static-terraform-state"
    region         = "us-west-2"
    key            = "legacy/terraform.tfstate"
    encrypt        = true
    dynamodb_table = "terraform_statelock"
  }
}

locals {
  env  = "production"
  name = "hyperbola"
}

resource "aws_s3_bucket" "media" {
  bucket = "www.hyperbolausercontent.net"
  acl    = "private"

  lifecycle_rule {
    id      = "retire"
    enabled = true

    tags = {
      rule      = "retire"
      autoclean = "true"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }

  versioning {
    enabled = true
  }

  tags = {
    Name        = "hyperbola-app media files for ${local.env}"
    Environment = local.env
    project     = "legacy"
    managed_by  = "terraform"
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls   = true
  block_public_policy = true

  ignore_public_acls = true

  restrict_public_buckets = true
}

resource "aws_s3_bucket" "backup" {
  bucket = "hyperbola-app-backup-${local.env}"
  acl    = "private"

  lifecycle_rule {
    id      = "retire"
    enabled = true

    tags = {
      rule      = "retire"
      autoclean = "true"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }

  tags = {
    Name        = "hyperbola-app database backups for ${local.env}"
    Environment = local.env
    project     = "legacy"
    managed_by  = "terraform"
  }
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket = aws_s3_bucket.backup.id

  block_public_acls   = true
  block_public_policy = true

  ignore_public_acls = true

  restrict_public_buckets = true
}

output "media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "media_bucket_arn" {
  value = aws_s3_bucket.media.arn
}

output "backup_bucket" {
  value = aws_s3_bucket.backup.bucket
}

output "backup_bucket_arn" {
  value = aws_s3_bucket.backup.arn
}
