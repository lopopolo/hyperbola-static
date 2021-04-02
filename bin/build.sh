#!/usr/bin/env bash

set -euo pipefail

webpack_mode=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -d | --development)
      webpack_mode="development"
      ;;
    -p | --production)
      webpack_mode="production"
      ;;
    *)
      echo "Unknown parameter passed: $1"
      exit 1
      ;;
  esac
  shift
done

if [ -z "$webpack_mode" ]; then
  echo "Must pass one of [ --development | --production ]"
  exit 1
fi

set -x

if [ -d "dist" ]; then
  rm -r "dist"
fi

for slice in {0..3}; do
  npx webpack --mode "$webpack_mode" --env "slice=$slice" --env "chunks=4"
done
