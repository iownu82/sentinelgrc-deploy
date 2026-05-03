# ============================================================================
# Lambda Layer - py_webauthn for FIDO2/passkey authentication
# ============================================================================
#
# Provides webauthn==2.5.0 and its dependencies (cryptography, cbor2, cffi)
# to the four passkey Lambdas. Layer is built locally then uploaded.
#
# To rebuild: cd lambda-layers/webauthn && rm -rf python && pip3 install ...
# (See lambda-layers/webauthn/build.sh for canonical rebuild command)

data "archive_file" "webauthn_layer" {
  type        = "zip"
  source_dir  = "${path.root}/../../lambda-layers/webauthn"
  output_path = "${path.module}/.terraform-build/webauthn-layer.zip"
  excludes = [
    "requirements.txt",
    "build.sh",
    ".DS_Store",
  ]
}

resource "aws_lambda_layer_version" "webauthn" {
  filename         = data.archive_file.webauthn_layer.output_path
  layer_name       = "bis3-defense-webauthn"
  description      = "py_webauthn 2.5.0 + cryptography + cbor2 for FIDO2/passkey auth"
  source_code_hash = data.archive_file.webauthn_layer.output_base64sha256

  compatible_runtimes      = ["python3.12"]
  compatible_architectures = ["x86_64"]
}

output "webauthn_layer_arn" {
  value       = aws_lambda_layer_version.webauthn.arn
  description = "ARN of the webauthn Lambda layer (versioned)"
}


# ============================================================================
# Lambda Layer - shared helpers for auth Lambdas
# ============================================================================
#
# Provides cookies.py, responses.py, jwt_verifier.py, cognito_client.py
# to all auth Lambdas. Source of truth is backend-lambdas/_shared/.
#
# To rebuild: cd lambda-layers/shared && ./build.sh
# (This copies _shared/*.py into the layer's python/ subdirectory.)

data "archive_file" "shared_layer" {
  type        = "zip"
  source_dir  = "${path.root}/../../lambda-layers/shared"
  output_path = "${path.module}/.terraform-build/shared-layer.zip"

  excludes = [
    "build.sh",
    ".DS_Store",
  ]
}

resource "aws_lambda_layer_version" "shared" {
  filename         = data.archive_file.shared_layer.output_path
  layer_name       = "bis3-defense-shared"
  description      = "Shared helper modules: cookies, responses, jwt_verifier, cognito_client"
  source_code_hash = data.archive_file.shared_layer.output_base64sha256

  compatible_runtimes      = ["python3.12"]
  compatible_architectures = ["x86_64"]
}

output "shared_layer_arn" {
  value       = aws_lambda_layer_version.shared.arn
  description = "ARN of the shared helpers Lambda layer (versioned)"
}
