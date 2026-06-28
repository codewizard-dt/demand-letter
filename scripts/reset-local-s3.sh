#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <bucket-name> [aws s3 rm extra args]" >&2
  exit 1
fi

bucket="$1"
shift || true

if [ "$#" -gt 0 ]; then
  aws s3 rm "s3://$bucket" --recursive "$@"
else
  aws s3 rm "s3://$bucket" --recursive
fi
