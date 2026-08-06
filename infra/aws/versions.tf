terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state deliberately not configured here — see README.md's
  # "Before you apply" section. Bootstrapping an S3/DynamoDB backend is a
  # one-time manual step that has to happen before this block can reference
  # it, so it's documented rather than hardcoded to a bucket name that
  # doesn't exist yet.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "groceries-app"
      ManagedBy = "terraform"
    }
  }
}
