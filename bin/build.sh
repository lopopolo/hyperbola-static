#!/usr/bin/env bash

set -euo pipefail

mode=""

while [[ "$#" -gt 0 ]]; do
  case $1 in
    -d|--development)
      mode="development"
      shift
      ;;
    -p|--production)
      mode="production"
      ;;
    *)
      echo "Unknown parameter passed: $1"
      exit 1
      ;;
  esac
  shift
done

if [ -z "$mode" ]; then
  echo "Must pass one of [ --development | --production ]"
  exit 1
fi

set -x
for slice in {0..3}; do
  npx webpack --mode "$mode" --env "slice=$slice" --env "chunks=4"
done
