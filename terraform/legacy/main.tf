terraform {
  backend "s3" {
    bucket         = "hyperbola-static-terraform-state"
    region         = "us-west-2"
    key            = "legacy/terraform.tfstate"
    encrypt        = true
    dynamodb_table = "terraform_statelock"
  }
}

variable "env" {
  default = "production"
  type = string
}

variable "name" {
  default = "hyperbola"
  type = string
}

resource "aws_s3_bucket" "media" {
  bucket = "www.hyperbolausercontent.net"
  acl    = "private"

  versioning {
    enabled = true
  }

  tags = {
    Name        = "hyperbola-app media files for ${var.env}"
    Environment = var.env
    project     = "legacy"
    managed_by  = "terraform"
  }
}

resource "aws_s3_bucket" "backup" {
  bucket = "hyperbola-app-backup-${var.env}"
  acl    = "private"

  tags = {
    Name        = "hyperbola-app database backups for ${var.env}"
    Environment = var.env
    project     = "legacy"
    managed_by  = "terraform"
  }
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
