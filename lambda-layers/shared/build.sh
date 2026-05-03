#!/bin/bash
# Rebuild the bis3-defense-shared Lambda layer.
#
# This layer provides:
#   1. Shared helper modules from backend-lambdas/_shared/ (cookies, responses,
#      jwt_verifier, cognito_client)
#   2. PyPI dependencies used by auth Lambdas (python-jose for JWT verification)
#
# Run this script after editing _shared/*.py or requirements.txt, then run
# `terraform apply` to publish a new layer version.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SHARED_SRC="${REPO_ROOT}/backend-lambdas/_shared"
LAYER_DST="${SCRIPT_DIR}/python"
REQS="${SCRIPT_DIR}/requirements.txt"

echo "Rebuilding shared layer..."
echo "  Helper source: ${SHARED_SRC}"
echo "  Target:        ${LAYER_DST}"
echo "  Requirements:  ${REQS}"

rm -rf "${LAYER_DST}"
mkdir -p "${LAYER_DST}"

# Install PyPI deps as Linux x86_64 wheels (Lambda runtime)
pip3 install \
  -r "${REQS}" \
  -t "${LAYER_DST}" \
  --platform manylinux2014_x86_64 \
  --only-binary=:all: \
  --upgrade \
  --quiet

# Copy local helpers on top
cp "${SHARED_SRC}"/*.py "${LAYER_DST}/"

echo "Done. Top-level files in layer:"
ls -1 "${LAYER_DST}" | head -20
echo "..."
echo "Total entries: $(find "${LAYER_DST}" | wc -l)"
