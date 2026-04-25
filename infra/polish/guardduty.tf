# infra/polish/guardduty.tf
#
# Amazon GuardDuty threat detection across the GovCloud account.
# Continuously analyzes CloudTrail, VPC Flow Logs, and DNS logs for malicious
# activity. Findings published to Security Hub when both are enabled.
#
# Federal compliance:
#   AU-2     Audit Events - GuardDuty findings are security audit events
#   AU-12    Audit Generation - automated finding generation
#   IR-4     Incident Handling - findings trigger IR workflows
#   IR-5     Incident Monitoring - real-time threat visibility
#   RA-5     Vulnerability Monitoring - detects compromised resources
#   SI-3     Malicious Code Protection - detects cryptominers, malware
#   SI-4     Information System Monitoring - core monitoring control
#   SI-4(2)  Automated Tools for Real-Time Analysis
#   SI-4(4)  Inbound and Outbound Communications Traffic
#   SI-5     Security Alerts - findings ARE alerts
#
# Cost: ~$5-10/mo at solo founder traffic levels (scales with account activity)

# ============================================================================
# GUARDDUTY DETECTOR
# ============================================================================

resource "aws_guardduty_detector" "main" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES" # Federal best practice (default is 6 HOURS)

  # Datasources to monitor
  datasources {
    s3_logs {
      enable = true # Detects malicious S3 data access patterns
    }

    kubernetes {
      audit_logs {
        enable = false # No EKS in our architecture
      }
    }

    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = false # No EC2 instances in our architecture
        }
      }
    }
  }

  tags = {
    Name        = "bis3-defense-guardduty"
    Description = "GuardDuty threat detection for BIS3 Defense GovCloud account"
    Coverage    = "all-supported-datasources"
  }
}
