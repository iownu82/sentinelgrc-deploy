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
