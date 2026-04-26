#!/bin/bash
# Rebuild the webauthn Lambda layer for Python 3.12 + Lambda x86_64
# Run from /Users/dropdead/Documents/csrmfc-ai/lambda-layers/webauthn/
set -euo pipefail
rm -rf python/
pip3 install \
  --target python/ \
  --platform manylinux2014_x86_64 \
  --python-version 3.12 \
  --only-binary=:all: \
  --upgrade \
  --no-cache-dir \
  -r requirements.txt
echo "Layer rebuilt. Size:"
du -sh python/
