// RiskRadar — Complete NIST SP 800-53 Rev 5 Control Statement Templates
// All 20 control families — DoD Moderate/High baseline
// Tool placeholders: [TOOL:id] — auto-populated based on environment config
// Org placeholders: [ORG], [SYSTEM], [ISSO], [ISSM], [AO]

export const ALL_TEMPLATES = {

  // ═══════════════════════════════════════════════════════════════════════════
  // AC — ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  "AC-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated an Access Control Policy that addresses purpose, scope, roles, responsibilities, management commitment, coordination among organizational entities, and compliance. The policy is consistent with applicable federal laws, executive orders, directives, regulations, policies, standards, and guidelines including DoDI 8500.01, NIST SP 800-53 Rev 5, and applicable DISA STIGs. The Access Control Policy is reviewed and updated at least annually or when significant changes occur. The [ISSO] is responsible for ensuring the policy remains current. Procedures to facilitate the implementation of the access control policy are documented and maintained in [ORG]'s standard operating procedures library.`,
    tools:[],
  },
  "AC-2": {
    title:"Account Management",
    body:`Account management for [SYSTEM] is implemented through [TOOL:ad] and enforced via [TOOL:gpo]. All accounts (user, privileged, service, guest, temporary, and emergency) are established, activated, modified, reviewed, disabled, and removed in accordance with [ORG]'s account management procedures. Account creation requires documented supervisor approval. Accounts are reviewed quarterly by the [ISSO]. Inactive accounts are disabled after 30 days. Privileged accounts use separate credentials from standard user accounts. Account types, conditions of group membership, and required approvals are documented. Account management events are logged to [TOOL:splunk] with automated alerting for unauthorized changes. Compliance is validated via [TOOL:stig] and [TOOL:scap].`,
    tools:["ad","gpo","splunk","stig","scap"],
  },
  "AC-3": {
    title:"Access Enforcement",
    body:`Access enforcement for [SYSTEM] is implemented through role-based access control (RBAC) in [TOOL:ad]. NTFS permissions enforce least privilege at the file system level. [TOOL:gpo] enforces access control settings across all Windows systems. Network access is controlled by [TOOL:paloalto] enforcing deny-all/permit-by-exception. Remote access is controlled via [TOOL:ivanti]. Database access is restricted to authorized roles. Access enforcement configurations are validated against DISA STIGs via [TOOL:scap] quarterly.`,
    tools:["ad","gpo","paloalto","ivanti","scap","stig"],
  },
  "AC-4": {
    title:"Information Flow Enforcement",
    body:`[SYSTEM] enforces approved authorizations for controlling the flow of information within the system and between interconnected systems. [TOOL:paloalto] enforces information flow control policies at the network perimeter using application-aware firewall rules, preventing unauthorized information flows between security domains. [TOOL:zscaler] enforces outbound web traffic policies preventing data exfiltration. Data transfer between networks of different classification levels is controlled through approved guard solutions. [TOOL:splunk] monitors for policy violations. Information flow control policies are reviewed annually and validated via [TOOL:stig] checklists.`,
    tools:["paloalto","zscaler","splunk","stig"],
  },
  "AC-5": {
    title:"Separation of Duties",
    body:`[SYSTEM] enforces separation of duties through [TOOL:ad] RBAC. No single individual has the ability to both initiate and approve transactions, or to perform all functions of a critical or sensitive operation without independent verification. System administrators do not have access to audit log management. Security personnel are separate from operations personnel. The [ISSO] and system administrators have separate accounts and responsibilities. Separation of duties assignments are documented and reviewed quarterly. [TOOL:splunk] detects and alerts on separation of duties violations. Compliance is validated via [TOOL:stig] quarterly.`,
    tools:["ad","splunk","stig"],
  },
  "AC-6": {
    title:"Least Privilege",
    body:`[SYSTEM] employs the principle of least privilege through [TOOL:ad] RBAC. Users are granted only minimum permissions necessary for assigned duties. Privileged accounts are separate from standard accounts and used only for administrative tasks. [TOOL:crowdstrike] monitors for privilege escalation. [TOOL:gpo] enforces User Account Control on all Windows systems. Privileged account usage is reviewed monthly by the [ISSO] via [TOOL:splunk]. Least privilege compliance is validated via [TOOL:scap] and [TOOL:stig] quarterly.`,
    tools:["ad","crowdstrike","gpo","splunk","scap","stig"],
  },
  "AC-7": {
    title:"Unsuccessful Logon Attempts",
    body:`[SYSTEM] enforces account lockout via [TOOL:gpo]: accounts lock after 5 consecutive failed attempts with 15-minute lockout duration. [TOOL:cac] PKI infrastructure locks the CAC after 3 incorrect PIN attempts. Failed logon events are logged to [TOOL:splunk] with alerting for potential brute force. Lockout thresholds are validated via [TOOL:scap] and [TOOL:stig] checklists.`,
    tools:["gpo","cac","splunk","scap","stig"],
  },
  "AC-8": {
    title:"System Use Notification",
    body:`[SYSTEM] displays the DoD-approved system use notification banner before granting access. The banner contains the standard DoD warning language stating the system is for authorized use only, is subject to monitoring, and that use constitutes consent to monitoring. The banner is enforced via [TOOL:gpo] on all Windows systems and via login banners on network devices ([TOOL:juniper], [TOOL:cisco9300]). [TOOL:ivanti] displays the banner before VPN authentication. Banner configuration is validated via [TOOL:scap] and [TOOL:stig] (DISA STIG V-220708). The [ISSO] reviews banner compliance quarterly.`,
    tools:["gpo","juniper","cisco9300","ivanti","scap","stig"],
  },
  "AC-10": {
    title:"Concurrent Session Control",
    body:`[SYSTEM] limits the number of concurrent sessions for each user account via [TOOL:gpo] and [TOOL:ad] session management policies. Privileged accounts are limited to a single concurrent session. Standard user session limits are enforced per [ORG] policy. [TOOL:ivanti] VPN enforces concurrent session limits for remote access. Session limits are configured per DISA STIG requirements and validated via [TOOL:scap].`,
    tools:["gpo","ad","ivanti","scap","stig"],
  },
  "AC-11": {
    title:"Device Lock",
    body:`[SYSTEM] enforces automatic device lock after 15 minutes of inactivity via [TOOL:gpo] on all Windows systems. [TOOL:cac] re-authentication is required to unlock. Screen savers are password-protected. Device lock is validated via [TOOL:scap] and [TOOL:stig] checklists quarterly.`,
    tools:["gpo","cac","scap","stig"],
  },
  "AC-12": {
    title:"Session Termination",
    body:`[SYSTEM] automatically terminates user sessions after defined conditions including inactivity timeout (15 minutes), session duration limits, and logoff. [TOOL:ivanti] VPN sessions are terminated after inactivity or maximum session duration. [TOOL:gpo] enforces session termination policies on Windows systems. Session termination is logged to [TOOL:splunk]. Compliance is validated via [TOOL:stig] checklists.`,
    tools:["ivanti","gpo","splunk","stig"],
  },
  "AC-14": {
    title:"Permitted Actions Without Identification or Authentication",
    body:`[SYSTEM] identifies and documents user actions that can be performed without identification or authentication. Actions permitted without authentication are limited to viewing publicly available information only and do not include access to any CUI or sensitive system functions. All such permitted actions are reviewed and approved by the [ISSO] and [ISSM] annually. [TOOL:paloalto] enforces network-level controls ensuring unauthenticated access is restricted.`,
    tools:["paloalto"],
  },
  "AC-17": {
    title:"Remote Access",
    body:`Remote access to [SYSTEM] is provided exclusively through [TOOL:ivanti] VPN with [TOOL:cac] certificate-based authentication. All remote sessions use TLS 1.2 or higher. [TOOL:zscaler] provides additional security for remote user web traffic. Remote access is restricted to authorized personnel and logged to [TOOL:splunk]. [TOOL:paloalto] enforces network-level controls on remote traffic. Remote access complies with DISA STIG requirements validated via [TOOL:stig] checklists.`,
    tools:["ivanti","cac","zscaler","splunk","paloalto","stig"],
  },
  "AC-18": {
    title:"Wireless Access",
    body:`Wireless access to [SYSTEM] is prohibited unless specifically authorized and documented. Where wireless is authorized, it is implemented with WPA3 encryption, [TOOL:cac]-based authentication, and segregated from the primary system network. [TOOL:paloalto] enforces wireless traffic policies. Wireless access points are inventoried and reviewed quarterly by the [ISSO]. Unauthorized wireless devices are detected and reported. Wireless configurations comply with DISA STIG requirements.`,
    tools:["cac","paloalto","stig"],
  },
  "AC-19": {
    title:"Access Control for Mobile Devices",
    body:`Mobile device access to [SYSTEM] is controlled through [ORG]'s Mobile Device Management (MDM) policy. Mobile devices must meet [ORG]-defined security requirements including encryption, screen lock, and remote wipe capability before accessing [SYSTEM] resources. [TOOL:ivanti] VPN is required for all mobile access. [TOOL:cac]-based authentication is required. Mobile device compliance is monitored by the [ISSO] and reported to the [ISSM] quarterly. Personally-owned mobile devices (BYOD) are prohibited from accessing CUI without [ISSM] and [AO] approval.`,
    tools:["ivanti","cac"],
  },
  "AC-20": {
    title:"Use of External Systems",
    body:`[ORG] establishes terms and conditions for authorized users accessing [SYSTEM] from external systems. Personnel are prohibited from using personally-owned devices to access [SYSTEM] CUI without [ISSO] approval. [TOOL:ivanti] VPN with [TOOL:cac] authentication is required for all external access. [TOOL:zscaler] enforces web access policies. External system connections are reviewed annually by the [ISSO].`,
    tools:["ivanti","cac","zscaler"],
  },
  "AC-21": {
    title:"Information Sharing",
    body:`[ORG] establishes information sharing agreements and procedures governing the sharing of [SYSTEM] information with external entities. Information sharing decisions are made by the [ISSO] in coordination with the [ISSM] and [AO] based on applicable laws, regulations, and policies. [TOOL:paloalto] enforces technical controls on information flows to external parties. All information sharing arrangements are documented and reviewed annually. CUI sharing complies with CUI Registry and applicable federal regulations.`,
    tools:["paloalto"],
  },
  "AC-22": {
    title:"Publicly Accessible Content",
    body:`[ORG] designates authorized individuals to post information publicly on behalf of [SYSTEM]. Publicly accessible content is reviewed by the [ISSO] before posting to ensure it does not contain CUI or nonpublic information. Public-facing servers are segregated from internal systems by [TOOL:paloalto] DMZ architecture. [TOOL:zscaler] provides web proxy controls. The [ISSO] reviews publicly accessible content quarterly for compliance and accuracy.`,
    tools:["paloalto","zscaler"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AT — AWARENESS AND TRAINING
  // ═══════════════════════════════════════════════════════════════════════════
  "AT-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a Security Awareness and Training Policy that addresses purpose, scope, roles, responsibilities, and compliance. The policy requires all personnel with access to [SYSTEM] to complete security awareness training. The policy is reviewed and updated annually. The [ISSM] is responsible for the overall security training program. Training procedures are documented and available to all personnel.`,
    tools:[],
  },
  "AT-2": {
    title:"Literacy Training and Awareness",
    body:`All personnel with access to [SYSTEM] complete security awareness training within 10 days of account creation and annually thereafter. Training covers: recognizing threats (phishing, social engineering, insider threats), CUI handling requirements, password security, CAC usage, reporting requirements, and acceptable use. Training is provided via [ORG]'s learning management system (DoD ATCTS / JKO). Training completion is tracked and reported to the [ISSM] quarterly. Personnel who fail to complete training have accounts suspended until compliance is achieved. Training records are maintained for 3 years.`,
    tools:["cac"],
  },
  "AT-3": {
    title:"Role-Based Training",
    body:`Personnel with significant security responsibilities for [SYSTEM] receive role-based training in addition to general security awareness. Role-based training is required for: [ISSO] (annual 40-hour IAT Level II training per DoD 8570.01-M), [ISSM] (annual 40-hour IAM Level II training), System Administrators (annual SA training per DISA guidance), privileged users (annual privileged access training). Training completion is documented and verified by the [ISSM]. The [ISSO] maintains training records in [TOOL:emass] and reports compliance to the [AO] annually. Certifications required: CompTIA Security+, CISSP, or equivalent per DoD 8570.01-M/DoD 8140.`,
    tools:["emass"],
  },
  "AT-4": {
    title:"Training Records",
    body:`[ORG] maintains training records for all personnel with access to [SYSTEM]. Records document: trainee name, training type, training date, completion status, and trainer/system. Records are maintained for a minimum of 3 years. The [ISSO] reviews training records quarterly and reports compliance status to the [ISSM]. Training completion reports are generated from [ORG]'s learning management system (DoD ATCTS / JKO) and archived. Non-compliant personnel are identified and reported to supervisors within 5 business days.`,
    tools:[],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AU — AUDIT AND ACCOUNTABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  "AU-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated an Audit and Accountability Policy covering purpose, scope, roles, responsibilities, and compliance. The policy requires audit logging on all [SYSTEM] components and is consistent with DoDI 8500.01 and applicable DISA STIGs. The policy is reviewed annually. The [ISSO] is responsible for implementing audit and accountability controls.`,
    tools:[],
  },
  "AU-2": {
    title:"Event Logging",
    body:`[SYSTEM] logs the following event types: successful and failed logon attempts, privilege escalation, object access, policy changes, account management, process creation, system events, and network connection events. [TOOL:gpo] enforces audit policy on all Windows systems. [TOOL:paloalto] logs all traffic, threats, and URL events. [TOOL:crowdstrike] logs endpoint detections. [TOOL:juniper] and [TOOL:cisco9300] forward syslog to [TOOL:splunk]. [TOOL:acas] logs all scan activity. All events forward to [TOOL:splunk] within 5 minutes. The [ISSO] reviews and coordinates event logging requirements quarterly with system administrators.`,
    tools:["gpo","paloalto","crowdstrike","juniper","cisco9300","splunk","acas","stig"],
  },
  "AU-3": {
    title:"Content of Audit Records",
    body:`Audit records for [SYSTEM] contain: date/time of event, event type, subject identity (user ID/process), outcome (success/failure), and source identifier (IP/hostname). [TOOL:splunk] normalizes records from all sources. [TOOL:paloalto] records include session details, bytes transferred, and threat indicators. [TOOL:crowdstrike] records include process trees and behavioral context. Record content is validated against DISA STIGs via [TOOL:scap].`,
    tools:["splunk","paloalto","crowdstrike","scap","stig"],
  },
  "AU-4": {
    title:"Audit Log Storage Capacity",
    body:`[SYSTEM] allocates audit log storage sufficient to retain logs for the required retention period without loss. [TOOL:splunk] is sized to retain 1 year of online log data with automated capacity alerts at 80% utilization. Archived logs are stored on dedicated encrypted storage. Log storage capacity is reviewed quarterly by the [ISSO]. Alerts are configured to notify the [ISSO] and system administrators when storage thresholds are reached. Capacity planning is reviewed annually.`,
    tools:["splunk"],
  },
  "AU-5": {
    title:"Response to Audit Logging Process Failures",
    body:`[SYSTEM] alerts the [ISSO] and system administrators in the event of audit logging process failures. [TOOL:splunk] generates automated alerts when log forwarding ceases or indexing failures occur. [TOOL:crowdstrike] alerts when endpoint logging is interrupted. Alert notifications are sent via email and ticketing system within 15 minutes of failure detection. The [ISSO] investigates and resolves logging failures within 4 hours. Logging failure events are documented and reported to the [ISSM].`,
    tools:["splunk","crowdstrike"],
  },
  "AU-6": {
    title:"Audit Record Review, Analysis, Reporting",
    body:`Audit records for [SYSTEM] are reviewed weekly by the [ISSO] using [TOOL:splunk] dashboards. [TOOL:crowdstrike] provides automated behavioral analytics and threat correlation. Automated alerts are configured for high-priority events including failed authentication patterns (>5 failures/hour), privilege escalation, after-hours access, and policy violations. Significant findings are reported to the [ISSM] within 24 hours. Monthly audit summaries are provided to the [AO]. Annual audit log reviews are conducted as part of the continuous monitoring program.`,
    tools:["splunk","crowdstrike"],
  },
  "AU-7": {
    title:"Audit Record Reduction and Report Generation",
    body:`[SYSTEM] provides audit record reduction and report generation capabilities through [TOOL:splunk]. [TOOL:splunk] supports on-demand report generation, automated scheduled reports, and ad-hoc queries across all audit sources. Reports can be filtered by time range, event type, user, source system, and severity. The [ISSO] uses [TOOL:splunk] to generate monthly compliance reports, incident investigations, and AO briefings. Report generation does not alter original audit records. Audit data integrity is maintained throughout the reduction process.`,
    tools:["splunk"],
  },
  "AU-8": {
    title:"Time Stamps",
    body:`[SYSTEM] uses internal system clocks to generate timestamps for audit records. All Windows systems ([TOOL:win11], [TOOL:server2016], [TOOL:server2019], [TOOL:server2022]) synchronize to [ORG]'s authoritative NTP server which is traceable to the U.S. Naval Observatory (USNO) time standard. Network devices ([TOOL:juniper], [TOOL:cisco9300], [TOOL:paloalto]) are configured to use the same NTP hierarchy. Time synchronization is validated via [TOOL:stig] checks quarterly. Maximum clock drift tolerance is ±2 seconds.`,
    tools:["win11","server2016","server2019","server2022","juniper","cisco9300","paloalto","stig"],
  },
  "AU-9": {
    title:"Protection of Audit Information",
    body:`Audit logs are protected from unauthorized access, modification, and deletion. [TOOL:splunk] stores logs on dedicated infrastructure with RBAC — only security personnel can access audit data. Log administrators are separate from system administrators. [TOOL:splunk] index integrity is verified via SHA-256. Local Windows event logs are protected via [TOOL:gpo] restricting access to administrators. Audit data is retained encrypted. Audit log protection compliance is validated via [TOOL:stig] quarterly.`,
    tools:["splunk","gpo","stig"],
  },
  "AU-10": {
    title:"Non-Repudiation",
    body:`[SYSTEM] implements non-repudiation through [TOOL:cac] PKI digital signatures for authentication events. DoD CAC certificates provide cryptographically-bound user identity for all authentication events. [TOOL:splunk] retains immutable audit records linking actions to authenticated identities. Digital signatures are used for critical transactions requiring non-repudiation. [TOOL:ad] Kerberos tickets provide timestamped authentication records. Non-repudiation mechanisms comply with DoD PKI policy.`,
    tools:["cac","splunk","ad"],
  },
  "AU-11": {
    title:"Audit Record Retention",
    body:`Audit records for [SYSTEM] are retained for a minimum of 3 years per NARA requirements and DoD policy. [TOOL:splunk] retains 1 year of online data. Records older than 1 year are archived to encrypted storage for the remaining retention period. Retention is enforced via [TOOL:splunk] automated archival policies. Archive integrity is verified quarterly. Retention schedules comply with DoDI 5015.02 and applicable NARA General Records Schedules. The [ISSO] reviews retention compliance annually.`,
    tools:["splunk"],
  },
  "AU-12": {
    title:"Audit Record Generation",
    body:`[SYSTEM] generates audit records on all components. Windows audit policy enforced via [TOOL:gpo]. [TOOL:paloalto] generates traffic/threat/URL logs. [TOOL:crowdstrike] generates EDR events. [TOOL:acas] generates scan records. [TOOL:juniper] and [TOOL:cisco9300] generate syslog. All records forward to [TOOL:splunk]. [TOOL:hbss] generates AV/HIPS events. Audit generation is validated via [TOOL:scap] and [TOOL:stig] quarterly.`,
    tools:["gpo","paloalto","crowdstrike","acas","juniper","cisco9300","splunk","hbss","scap","stig"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CA — ASSESSMENT, AUTHORIZATION, AND MONITORING
  // ═══════════════════════════════════════════════════════════════════════════
  "CA-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated an Assessment, Authorization, and Monitoring Policy consistent with DoDI 8510.01, NIST SP 800-37 Rev 2, and CSRMC. The policy addresses purpose, scope, roles, responsibilities, and compliance. It is reviewed annually and updated when significant changes occur. The [ISSM] is responsible for the overall assessment and authorization program for [SYSTEM].`,
    tools:[],
  },
  "CA-2": {
    title:"Control Assessments",
    body:`Security control assessments for [SYSTEM] are conducted annually by qualified assessors coordinated by the [ISSM] and approved by the [AO]. Assessment methods include documentation examination, personnel interviews, and control testing. [TOOL:scap] provides automated assessment for STIG compliance. [TOOL:acas] provides automated vulnerability assessment. [TOOL:splunk] supports audit log analysis. Assessment results are documented in the Security Assessment Report (SAR) maintained in [TOOL:emass]. Findings drive POAM entries and risk acceptance decisions.`,
    tools:["scap","acas","splunk","emass"],
  },
  "CA-3": {
    title:"Information Exchange",
    body:`[SYSTEM] connections to external systems are controlled through documented Interconnection Security Agreements (ISAs) and Memoranda of Understanding (MOUs). All external connections are approved by the [AO] before establishment. [TOOL:paloalto] enforces technical controls on all external connections. External connection documentation is maintained in [TOOL:emass] and reviewed annually. The [ISSO] monitors external connections via [TOOL:splunk] and reports anomalies to the [ISSM] within 24 hours.`,
    tools:["paloalto","emass","splunk"],
  },
  "CA-5": {
    title:"Plan of Action and Milestones",
    body:`[SYSTEM] maintains a POAM in [TOOL:emass] documenting all security weaknesses. The POAM is updated monthly by the [ISSO], reviewed quarterly by the [ISSM], and accepted by the [AO] at least annually. CAT I findings have 30-day timelines; CAT II have 90-day timelines; CAT III have 180-day timelines. POAM entries include weakness description, severity, POC, resources required, and scheduled completion date. Sources include [TOOL:acas] scans, [TOOL:scap] results, and self-assessment findings.`,
    tools:["emass","acas","scap"],
  },
  "CA-6": {
    title:"Authorization",
    body:`[SYSTEM] has been granted an Authority to Operate by the designated [AO] per DoDI 8510.01. The ATO package including SSP, SAR, and POAM is maintained in [TOOL:emass]. The [ISSO] monitors authorization status and initiates reauthorization no later than 6 months before expiration. Significant changes are assessed for authorization impact per the change management process. Authorization status is reported to the [AO] monthly.`,
    tools:["emass"],
  },
  "CA-7": {
    title:"Continuous Monitoring",
    body:`[SYSTEM] implements continuous monitoring per CSRMC Phase 5 and NIST SP 800-137. Program elements: weekly vulnerability scanning ([TOOL:acas]/[TOOL:tenablesc]); continuous EDR ([TOOL:crowdstrike]); real-time SIEM ([TOOL:splunk]); continuous AV/HIPS ([TOOL:hbss]); quarterly STIG compliance ([TOOL:scap]); monthly POAM review ([TOOL:emass]); annual control assessment. The [ISSO] reviews monitoring data weekly, reports to [ISSM] monthly, and briefs the [AO] quarterly. This program supports the cATO authorization objective.`,
    tools:["acas","tenablesc","crowdstrike","splunk","hbss","scap","emass"],
  },
  "CA-8": {
    title:"Penetration Testing",
    body:`[ORG] conducts penetration testing of [SYSTEM] at least annually and after significant changes. Penetration testing is performed by qualified testers operating under [ISSO] and [AO] authorization. Testing scope, rules of engagement, and methodology are documented before testing begins. [TOOL:acas] provides vulnerability identification supporting penetration test planning. Test results are documented in a penetration test report provided to the [ISSO] and [ISSM]. Findings are tracked in the POAM in [TOOL:emass] with associated remediation timelines.`,
    tools:["acas","emass"],
  },
  "CA-9": {
    title:"Internal System Connections",
    body:`Internal system connections within [SYSTEM] are authorized and documented by the [ISSO]. [TOOL:paloalto] enforces internal segmentation policies. [TOOL:cisco9300] implements VLAN segmentation. Internal connection documentation is maintained and reviewed annually. Unauthorized internal connections detected by [TOOL:crowdstrike] or [TOOL:splunk] trigger immediate investigation. Internal system connections comply with the network architecture documented in the SSP.`,
    tools:["paloalto","cisco9300","crowdstrike","splunk"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CM — CONFIGURATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  "CM-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a Configuration Management Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy requires all [SYSTEM] components to be configured per approved baselines derived from DISA STIGs and SRGs. The policy is reviewed annually. The [ISSO] is responsible for implementing configuration management controls for [SYSTEM].`,
    tools:[],
  },
  "CM-2": {
    title:"Baseline Configuration",
    body:`[SYSTEM] maintains documented baseline configurations for all components. Baselines are derived from DISA STIGs for [TOOL:win11], [TOOL:server2016], [TOOL:server2019], [TOOL:server2022], [TOOL:juniper], [TOOL:cisco9300], [TOOL:paloalto], and [TOOL:ivanti]. Baselines are stored in [ORG]'s configuration management repository. Deviations require CCB approval. Baseline compliance is assessed via [TOOL:scap] and [TOOL:stig] quarterly. [TOOL:acas] validates compliance against baselines during weekly scans.`,
    tools:["win11","server2016","server2019","server2022","juniper","cisco9300","paloalto","ivanti","scap","stig","acas"],
  },
  "CM-3": {
    title:"Configuration Change Control",
    body:`All configuration changes to [SYSTEM] are managed through a formal Change Control Board (CCB) process. Changes are submitted via [ORG]'s change management ticketing system, reviewed by the [ISSO] for security impact, approved by the CCB, tested in a non-production environment, and implemented during approved maintenance windows. Emergency changes are authorized by the [ISSM] and documented within 24 hours. Configuration changes are logged and audited via [TOOL:splunk]. [TOOL:crowdstrike] detects unauthorized configuration changes.`,
    tools:["splunk","crowdstrike"],
  },
  "CM-4": {
    title:"Impact Analyses",
    body:`[ORG] analyzes changes to [SYSTEM] for potential security impact before implementation. The [ISSO] conducts a Security Impact Analysis (SIA) for all proposed changes using NIST SP 800-128 guidance. Changes are categorized as minor, moderate, or significant based on impact. Significant changes require [AO] notification and may require reauthorization. [TOOL:acas] scans are conducted after changes to verify no new vulnerabilities were introduced. Change impact analysis results are documented in the change management record.`,
    tools:["acas"],
  },
  "CM-5": {
    title:"Access Restrictions for Change",
    body:`[SYSTEM] enforces access restrictions for production system changes. Only authorized change implementers can make changes to production systems. [TOOL:ad] RBAC restricts production system access to designated administrators. [TOOL:gpo] prevents unauthorized software installation. Changes are implemented only during approved maintenance windows. [TOOL:splunk] logs all production changes with user identity. [TOOL:crowdstrike] alerts on unauthorized change attempts. Production access is reviewed quarterly by the [ISSO].`,
    tools:["ad","gpo","splunk","crowdstrike"],
  },
  "CM-6": {
    title:"Configuration Settings (STIGs/SRGs)",
    body:`[SYSTEM] enforces DISA STIG/SRG configuration settings on all components. STIGs applied: Windows 11 STIG ([TOOL:win11]), Windows Server STIGs ([TOOL:server2016], [TOOL:server2019], [TOOL:server2022]), Network Infrastructure STIGs ([TOOL:juniper], [TOOL:cisco9300]), Palo Alto STIG ([TOOL:paloalto]), Ivanti VPN SRG ([TOOL:ivanti]). [TOOL:gpo] enforces Windows STIG settings. [TOOL:scap] validates STIG compliance quarterly. [TOOL:acas]/[TOOL:tenablesc] validates configuration compliance weekly. Non-compliant settings are documented in the POAM. The [ISSO] reviews compliance monthly and reports to the [ISSM].`,
    tools:["win11","server2016","server2019","server2022","juniper","cisco9300","paloalto","ivanti","gpo","scap","acas","tenablesc","stig"],
  },
  "CM-7": {
    title:"Least Functionality",
    body:`[SYSTEM] is configured to provide only essential capabilities. [TOOL:gpo] disables unnecessary services and features on Windows systems. [TOOL:paloalto] application-layer controls restrict traffic to approved applications only. [TOOL:hbss] HIPS blocks unauthorized application execution. [TOOL:zscaler] restricts web access to approved categories. Unnecessary ports and protocols are disabled per DISA STIG requirements. The approved ports/protocols/services list is maintained and reviewed quarterly by the [ISSO].`,
    tools:["gpo","paloalto","hbss","zscaler","stig"],
  },
  "CM-8": {
    title:"System Component Inventory",
    body:`[SYSTEM] maintains a current hardware and software inventory. [TOOL:acas]/[TOOL:tenablesc] performs automated asset discovery during weekly scans. [TOOL:crowdstrike] maintains real-time endpoint inventory. The [ISSO] reviews and reconciles the inventory monthly. Unauthorized assets trigger alerts reviewed within 24 hours. The inventory is maintained in [TOOL:emass] and synchronized quarterly. Software inventory includes version information and patch levels. Hardware inventory includes make, model, serial number, and network location.`,
    tools:["acas","tenablesc","crowdstrike","emass"],
  },
  "CM-9": {
    title:"Configuration Management Plan",
    body:`[ORG] maintains a Configuration Management Plan (CMP) for [SYSTEM] that defines CM roles, responsibilities, processes, and tools. The CMP documents baseline configuration management, change control procedures, configuration monitoring strategy, and configuration item identification. The CMP is reviewed and updated annually by the [ISSO]. The CMP is maintained in [TOOL:emass] as part of the ATO package. All personnel with CM responsibilities are trained on CMP procedures.`,
    tools:["emass"],
  },
  "CM-10": {
    title:"Software Usage Restrictions",
    body:`[ORG] uses software in accordance with applicable license agreements. Software inventory is maintained to ensure license compliance. [TOOL:gpo] restricts software installation to authorized applications only. [TOOL:crowdstrike] monitors for unauthorized software execution. Open-source software usage requires [ISSO] and legal review. The [ISSO] reviews software license compliance annually. Unauthorized software is removed upon detection. Software usage restrictions are documented in [ORG]'s acceptable use policy.`,
    tools:["gpo","crowdstrike"],
  },
  "CM-11": {
    title:"User-Installed Software",
    body:`[SYSTEM] restricts user-installed software via [TOOL:gpo] AppLocker policies on all Windows systems. Only [ISSO]-approved software may be installed. [TOOL:hbss] HIPS detects and blocks unauthorized installation. [TOOL:crowdstrike] monitors for unauthorized execution. Installation attempts are logged to [TOOL:splunk] and reviewed by the [ISSO]. Violations are investigated and reported to the [ISSM].`,
    tools:["gpo","hbss","crowdstrike","splunk"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CP — CONTINGENCY PLANNING
  // ═══════════════════════════════════════════════════════════════════════════
  "CP-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a Contingency Planning Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy is consistent with DoDI 8500.01, NIST SP 800-34, and applicable FEMA guidance. It requires [SYSTEM] to maintain a tested contingency plan. The policy is reviewed annually. The [ISSM] is responsible for the contingency planning program.`,
    tools:[],
  },
  "CP-2": {
    title:"Contingency Plan",
    body:`[ORG] has developed and maintained a Contingency Plan (CP) for [SYSTEM] consistent with NIST SP 800-34. The CP documents: system description, roles and responsibilities, activation procedures, recovery procedures (RTO: [RECOVERY TIME OBJECTIVE], RPO: [RECOVERY POINT OBJECTIVE]), reconstitution procedures, and testing schedule. The CP is reviewed and updated annually or after significant changes. It is maintained in [TOOL:emass] and approved by the [AO]. All personnel with CP roles are trained on their responsibilities. The CP is tested annually via tabletop exercise or functional exercise.`,
    tools:["emass"],
  },
  "CP-3": {
    title:"Contingency Training",
    body:`Personnel with contingency plan responsibilities for [SYSTEM] receive contingency training within 10 days of assignment and annually thereafter. Training covers: CP activation criteria, individual roles and responsibilities, backup system usage, communication procedures, and recovery priorities. Training is documented in training records maintained by the [ISSO]. Tabletop exercises serve as combined training and testing events. Training completion is reported to the [ISSM] annually.`,
    tools:[],
  },
  "CP-4": {
    title:"Contingency Plan Testing",
    body:`[ORG] tests the [SYSTEM] contingency plan annually to validate effectiveness. Testing methods include tabletop exercises, functional exercises, or full failover tests based on risk assessment. Testing validates: activation procedures, backup system functionality, recovery time objective (RTO) achievement, recovery point objective (RPO) achievement, and personnel notification. Test results are documented and provided to the [ISSM] and [AO]. Deficiencies identified during testing are tracked in the POAM in [TOOL:emass] with remediation timelines.`,
    tools:["emass"],
  },
  "CP-6": {
    title:"Alternate Storage Site",
    body:`[SYSTEM] uses an alternate storage site geographically separated from the primary site to store backup copies of [SYSTEM] data and essential system documentation. The alternate storage site is located at [ALTERNATE SITE LOCATION] and meets [ORG]'s physical and environmental protection requirements. Backup media is protected with encryption equivalent to the classification level of stored data. The [ISSO] verifies alternate storage site adequacy annually. Recovery capability from the alternate site is tested during contingency plan exercises.`,
    tools:[],
  },
  "CP-7": {
    title:"Alternate Processing Site",
    body:`[ORG] establishes an alternate processing site for [SYSTEM] capable of supporting essential mission functions with an RTO of [RECOVERY TIME OBJECTIVE]. The alternate site is geographically separated from the primary site and not subject to the same hazards. The alternate site has equipment and connectivity equivalent to [SYSTEM] requirements. Priority of service agreements are in place for telecommunications at the alternate site. Capability to transfer operations to the alternate site is tested during annual contingency plan exercises.`,
    tools:[],
  },
  "CP-8": {
    title:"Telecommunications Services",
    body:`[ORG] establishes alternate telecommunications services for [SYSTEM] including primary and secondary providers with independent routing paths. Telecommunications service priority designations (TSP) are obtained where required. Service level agreements define availability requirements. [TOOL:ivanti] provides backup remote access capability. [TOOL:paloalto] supports failover between primary and backup network connections. Telecommunications service availability is monitored via [TOOL:splunk] with alerting for outages.`,
    tools:["ivanti","paloalto","splunk"],
  },
  "CP-9": {
    title:"System Backup",
    body:`[SYSTEM] data and system images are backed up on the following schedule: full backup weekly, incremental backup daily. Backup copies are stored at the alternate storage site. Backup integrity is verified via automated checksum verification after each backup. [TOOL:server2022] backup procedures use Windows Server Backup or approved enterprise backup solution. Backup procedures are documented in the contingency plan. The [ISSO] verifies backup completion weekly. Backup restoration is tested quarterly. Backup retention meets the 90-day requirement per NARA guidance.`,
    tools:["server2022"],
  },
  "CP-10": {
    title:"System Recovery and Reconstitution",
    body:`[SYSTEM] provides recovery and reconstitution capabilities to a known secure state after disruption, compromise, or failure. Recovery procedures are documented in the Contingency Plan maintained in [TOOL:emass]. Recovery priorities are defined based on mission criticality. [TOOL:gpo] and [TOOL:stig]-compliant baseline configurations enable rapid system reconstitution. Recovery from backup is tested annually during contingency plan exercises. Transaction recovery capability ensures data consistency after recovery. Recovery time objective (RTO) is [RECOVERY TIME OBJECTIVE].`,
    tools:["emass","gpo","stig"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IA — IDENTIFICATION AND AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════════════
  "IA-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated an Identification and Authentication Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy requires CAC-based MFA for all organizational users and is consistent with DoDI 8520.02 and HSPD-12. The policy is reviewed annually. The [ISSO] is responsible for implementing identification and authentication controls.`,
    tools:[],
  },
  "IA-2": {
    title:"Identification and Authentication (Organizational Users)",
    body:`[SYSTEM] uniquely identifies and authenticates organizational users via [TOOL:cac] with PIN (MFA). [TOOL:ad] validates user identity against the DoD EDIPI in CAC certificates. [TOOL:ivanti] requires CAC for remote access. Local console access requires CAC where feasible. Service accounts use certificate-based authentication. Compliance is validated via [TOOL:stig] and [TOOL:scap].`,
    tools:["cac","ad","ivanti","stig","scap"],
  },
  "IA-3": {
    title:"Device Identification and Authentication",
    body:`[SYSTEM] identifies and authenticates devices before establishing connections. [TOOL:ad] machine accounts authenticate domain-joined systems via Kerberos. [TOOL:paloalto] enforces device certificate policies. [TOOL:crowdstrike] validates device identity and health. [TOOL:juniper] and [TOOL:cisco9300] use RADIUS/[TOOL:ad] for administrative authentication. [TOOL:ivanti] validates device certificates for VPN connections.`,
    tools:["ad","paloalto","crowdstrike","juniper","cisco9300","ivanti"],
  },
  "IA-4": {
    title:"Identifier Management",
    body:`[SYSTEM] manages identifiers by ensuring unique assignment, preventing identifier reuse for a minimum of 2 years, and disabling identifiers after 35 days of inactivity. [TOOL:ad] manages user and device identifiers. Identifiers are tied to DoD EDIPI via [TOOL:cac]. Account management procedures prevent duplicate or shared identifiers. The [ISSO] reviews identifier management compliance quarterly. Inactive identifier reports are generated from [TOOL:ad] monthly.`,
    tools:["ad","cac"],
  },
  "IA-5": {
    title:"Authenticator Management",
    body:`Authenticator management is implemented through [TOOL:cac] PKI and [TOOL:ad]. Password policy via [TOOL:gpo]: 15-character minimum, complexity required, 60-day maximum age, 24-password history. CAC PINs managed by DoD PKI. Service accounts have automated password rotation enforced by [TOOL:gpo]. Default credentials changed upon deployment. [TOOL:acas] detects default credential vulnerabilities. Compliance validated via [TOOL:scap] and [TOOL:stig].`,
    tools:["cac","ad","gpo","acas","scap","stig"],
  },
  "IA-6": {
    title:"Authentication Feedback",
    body:`[SYSTEM] obscures feedback of authentication information during the authentication process. Windows logon screens display asterisks instead of characters entered. [TOOL:ivanti] VPN client obscures PIN and password entry. Web-based authentication interfaces use password-type input fields. DISA STIG requirements for authentication feedback are validated via [TOOL:scap] and [TOOL:stig] checklists. No system provides authentication feedback that could be used to compromise credentials.`,
    tools:["ivanti","scap","stig"],
  },
  "IA-7": {
    title:"Cryptographic Module Authentication",
    body:`[SYSTEM] implements mechanisms for authentication to cryptographic modules that meet applicable FIPS 140-2/140-3 requirements. [TOOL:cac] uses FIPS 140-2 validated cryptographic modules. Windows systems are configured in FIPS mode via [TOOL:gpo]. [TOOL:ivanti] uses FIPS-validated VPN encryption. FIPS compliance is validated via [TOOL:scap] and [TOOL:stig] (System Cryptography policy setting).`,
    tools:["cac","gpo","ivanti","scap","stig"],
  },
  "IA-8": {
    title:"Identification and Authentication (Non-Organizational Users)",
    body:`Non-organizational users accessing [SYSTEM] are identified and authenticated using [TOOL:cac] certificates from a DoD-trusted CA or approved partner PKI. External access is controlled via [TOOL:paloalto] and [TOOL:ivanti]. Non-organizational accounts are time-limited, approved by the [ISSO], and reviewed quarterly. All non-organizational user access is logged to [TOOL:splunk].`,
    tools:["cac","paloalto","ivanti","splunk"],
  },
  "IA-11": {
    title:"Re-Authentication",
    body:`[SYSTEM] requires users to re-authenticate when roles change, after session inactivity (15 minutes via [TOOL:gpo] device lock), and when accessing privileged functions. [TOOL:cac] PIN re-entry is required after device lock. [TOOL:ivanti] VPN sessions require re-authentication after timeout. Re-authentication requirements are enforced via [TOOL:gpo] and validated via [TOOL:stig] compliance checks.`,
    tools:["gpo","cac","ivanti","stig"],
  },
  "IA-12": {
    title:"Identity Proofing",
    body:`[SYSTEM] leverages the DoD identity proofing process conducted by the Defense Manpower Data Center (DMDC) through the CAC issuance process. Identity proofing meets NIST SP 800-63A IAL2 requirements. In-person identity verification with original documents is required for CAC issuance. The identity proofing process is managed by [ORG]'s security office in coordination with the appropriate CAC issuing authority. The [ISSO] ensures all [SYSTEM] users have valid CAC credentials before account creation.`,
    tools:["cac"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IR — INCIDENT RESPONSE
  // ═══════════════════════════════════════════════════════════════════════════
  "IR-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated an Incident Response Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy is consistent with DoDI 8530.01, CJCSM 6510.01B, and NIST SP 800-61. It requires 72-hour reporting to DoD per DFARS 252.204-7012. The policy is reviewed annually. The [ISSO] is responsible for coordinating incident response for [SYSTEM].`,
    tools:[],
  },
  "IR-2": {
    title:"Incident Response Training",
    body:`Personnel with incident response responsibilities for [SYSTEM] receive IR training within 10 days of assignment and annually thereafter. Training covers: incident identification and classification, reporting procedures, containment strategies, evidence preservation, and communication protocols. [TOOL:crowdstrike] platform training is provided to security personnel. IR training is incorporated into the annual tabletop exercise. Training completion is documented and reported to the [ISSM].`,
    tools:["crowdstrike"],
  },
  "IR-3": {
    title:"Incident Response Testing",
    body:`[ORG] tests the [SYSTEM] incident response capability annually via tabletop exercise or functional exercise. Testing validates: detection capabilities ([TOOL:crowdstrike], [TOOL:splunk]), notification procedures, containment actions, recovery procedures, and reporting timelines. Exercises include scenarios relevant to [SYSTEM] (ransomware, data exfiltration, insider threat, supply chain compromise). Test results are documented and deficiencies tracked in POAM in [TOOL:emass]. After-action reports are provided to the [ISSM] and [AO].`,
    tools:["crowdstrike","splunk","emass"],
  },
  "IR-4": {
    title:"Incident Handling",
    body:`[ORG] implements an incident handling capability covering preparation, detection, analysis, containment, eradication, and recovery. [TOOL:crowdstrike] provides automated detection and host isolation. [TOOL:splunk] provides correlation and alerting. [TOOL:hbss] provides host-based detection and blocking. The [ISSO] coordinates incident response. Incidents are reported to the [ISSM] within 1 hour and to US-CERT/CISA within 72 hours per DFARS 252.204-7012. IR procedures are documented in the IR plan and exercised annually.`,
    tools:["crowdstrike","splunk","hbss"],
  },
  "IR-5": {
    title:"Incident Monitoring",
    body:`Incidents affecting [SYSTEM] are tracked in [ORG]'s incident tracking system from detection through closure. [TOOL:splunk] provides real-time monitoring and alerting. [TOOL:crowdstrike] provides automated incident tracking and case management. The [ISSO] maintains an incident log and provides monthly status reports to the [ISSM]. All incidents are documented with lessons learned incorporated into updated procedures and future training.`,
    tools:["splunk","crowdstrike"],
  },
  "IR-6": {
    title:"Incident Reporting",
    body:`[ORG] requires all personnel to immediately report suspected incidents to the [ISSO]. The [ISSO] reports confirmed incidents to the [ISSM] within 1 hour and to the appropriate CSSP within 4 hours. Cyber incidents are reported to DoD via DIBNet within 72 hours per DFARS 252.204-7012. [TOOL:crowdstrike] automated alerting notifies security personnel in real time. [TOOL:splunk] correlation triggers automated notifications. Reporting procedures are documented in the IR plan.`,
    tools:["crowdstrike","splunk"],
  },
  "IR-7": {
    title:"Incident Response Assistance",
    body:`[ORG] provides incident response support and resources for [SYSTEM] users. The [ISSO] serves as the primary point of contact for incident response assistance. [ORG] maintains relationships with the applicable CSSP (DCSA ISOC, DIBNet, US-CERT) for external IR assistance. [TOOL:crowdstrike] provides 24/7 threat intelligence and IR support via OverWatch service. Contact information for IR resources is documented in the IR plan and accessible to all personnel.`,
    tools:["crowdstrike"],
  },
  "IR-8": {
    title:"Incident Response Plan",
    body:`[ORG] maintains a formal Incident Response Plan (IRP) for [SYSTEM] consistent with NIST SP 800-61 and DoDI 8530.01. The IRP documents: incident classification criteria, roles and responsibilities, detection and analysis procedures, containment and eradication steps, recovery procedures, and reporting requirements including DFARS 252.204-7012 timelines. The IRP is reviewed and updated annually. Copies are maintained in [TOOL:emass] and accessible to IR team members. The IRP is tested annually via tabletop exercise.`,
    tools:["emass"],
  },
  "IR-10": {
    title:"Integrated Information Security Analysis Team",
    body:`[ORG] establishes an integrated information security analysis team for [SYSTEM] consisting of the [ISSO], [ISSM], system administrators, and network administrators. The team coordinates incident response activities using [TOOL:crowdstrike] and [TOOL:splunk] as primary analysis platforms. The team meets monthly to review security trends and quarterly to conduct formal threat analysis. Threat intelligence from [TOOL:crowdstrike] is incorporated into security analysis activities.`,
    tools:["crowdstrike","splunk"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MA — MAINTENANCE
  // ═══════════════════════════════════════════════════════════════════════════
  "MA-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a System Maintenance Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy requires all maintenance to be authorized, documented, and performed by qualified personnel. It is consistent with DoDI 8500.01 and applicable DISA STIGs. The policy is reviewed annually. The [ISSO] approves maintenance activities that may impact [SYSTEM] security posture.`,
    tools:[],
  },
  "MA-2": {
    title:"Controlled Maintenance",
    body:`All maintenance activities on [SYSTEM] are scheduled, documented, and controlled. Maintenance windows are established and communicated in advance. The [ISSO] reviews maintenance requests for security impact before approval. All maintenance actions are logged including: date/time, technician identity, nature of maintenance, and results. [TOOL:splunk] monitors system activity during maintenance. Hardware removed for maintenance is sanitized per MP-6 before removal. Maintenance records are retained for 3 years.`,
    tools:["splunk"],
  },
  "MA-3": {
    title:"Maintenance Tools",
    body:`[ORG] controls maintenance tools used on [SYSTEM]. Approved maintenance tools are documented and inspected before use. Media containing diagnostic programs is scanned by [TOOL:hbss] before use on [SYSTEM]. [TOOL:crowdstrike] is active during maintenance to detect malicious activity. Personal maintenance equipment (laptops, media) is prohibited unless explicitly approved by the [ISSO]. Remote maintenance tools are approved and monitored. Maintenance tool inventory is reviewed quarterly by the [ISSO].`,
    tools:["hbss","crowdstrike"],
  },
  "MA-4": {
    title:"Nonlocal Maintenance",
    body:`Remote maintenance of [SYSTEM] is conducted through [TOOL:ivanti] VPN with [TOOL:cac] authentication. All remote maintenance sessions are monitored and logged to [TOOL:splunk]. The [ISSO] approves all remote maintenance activities before execution. Remote maintenance is terminated immediately upon completion. Strong authenticators are required for all remote maintenance connections. Remote maintenance by vendors requires [ISSO] presence and real-time monitoring. All remote maintenance sessions are documented in the maintenance log.`,
    tools:["ivanti","cac","splunk"],
  },
  "MA-5": {
    title:"Maintenance Personnel",
    body:`[ORG] establishes procedures for maintenance personnel authorization for [SYSTEM]. Only personnel with appropriate background investigations and access authorizations perform maintenance. Vendor maintenance personnel are escorted by [ORG] personnel with equivalent clearances. The [ISSO] maintains a list of authorized maintenance personnel reviewed quarterly. Maintenance personnel authenticate via [TOOL:cac] before accessing [SYSTEM]. Temporary maintenance accounts are removed immediately after maintenance completion.`,
    tools:["cac"],
  },
  "MA-6": {
    title:"Timely Maintenance",
    body:`[ORG] obtains maintenance support and spare parts for [SYSTEM] within [MAINTENANCE TIMEFRAME] of failure. Spare parts inventory for critical components is maintained. Maintenance contracts with vendors are in place to ensure timely support. The [ISSM] is notified when maintenance cannot be completed within required timeframes. Alternative processing arrangements are activated per the Contingency Plan when maintenance exceeds tolerable outage times. Maintenance support availability is reviewed annually.`,
    tools:[],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MP — MEDIA PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════
  "MP-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a Media Protection Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy covers digital and non-digital media containing [SYSTEM] information including CUI. It is consistent with DoDI 5200.01 and NIST SP 800-88. The policy is reviewed annually. The [ISSO] is responsible for implementing media protection controls.`,
    tools:[],
  },
  "MP-2": {
    title:"Media Access",
    body:`Access to [SYSTEM] digital and non-digital media is restricted to authorized personnel. [TOOL:gpo] enforces removable media controls on Windows systems. USB storage devices are disabled via [TOOL:gpo] unless specifically authorized by the [ISSO]. [TOOL:hbss] controls removable media usage. [TOOL:crowdstrike] monitors for unauthorized removable media. Physical media containing CUI is stored in GSA-approved containers when not in use. Media access logs are maintained and reviewed monthly by the [ISSO].`,
    tools:["gpo","hbss","crowdstrike"],
  },
  "MP-3": {
    title:"Media Marking",
    body:`All [SYSTEM] media (digital and non-digital) containing CUI is marked with the appropriate CUI designation, handling requirements, and applicable limited dissemination controls. Marking follows CUI Registry requirements and DoD CUI Program guidance. Electronic files are marked using CUI headers and footers. Physical media labels are applied before use. The [ISSO] reviews media marking compliance quarterly. Unmarked media containing CUI is treated as CUI until properly marked or destroyed.`,
    tools:[],
  },
  "MP-4": {
    title:"Media Storage",
    body:`[SYSTEM] media containing CUI is stored in controlled areas with appropriate physical security. Digital media is stored in GSA-approved containers or locked cabinets. Backup media is stored at the alternate storage site with equivalent protection. Media inventories are maintained and reviewed quarterly by the [ISSO]. Media containing CUI is stored separately from unclassified non-CUI materials. Temperature and humidity controls protect media integrity. Media storage areas are included in physical security inspections.`,
    tools:[],
  },
  "MP-5": {
    title:"Media Transport",
    body:`[SYSTEM] media containing CUI is protected during transport outside controlled areas. Digital media is encrypted using FIPS 140-2 approved mechanisms before transport. Transport is via approved courier or secure mailing services with chain of custody documentation. Media transport is tracked using [ORG]'s media log. The [ISSO] approves all media transport outside the facility. Media is never left unattended during transport. Receiving confirmation is documented.`,
    tools:[],
  },
  "MP-6": {
    title:"Media Sanitization",
    body:`[SYSTEM] media is sanitized before disposal, reuse, or removal from organizational control. Sanitization is performed per NIST SP 800-88 guidelines: overwriting for HDDs, degaussing for magnetic media, physical destruction for SSDs and optical media. [TOOL:hbss] scans media before sanitization to identify stored data. Sanitization is documented with media type, sanitization method, date, technician, and verification. Records are retained for 3 years. Sanitization equipment is maintained and verified annually. CUI media is sanitized to at minimum Clear or Purge standard per NIST SP 800-88.`,
    tools:["hbss"],
  },
  "MP-7": {
    title:"Media Use",
    body:`[ORG] restricts use of removable media on [SYSTEM] components. [TOOL:gpo] disables USB storage ports on all workstations except those specifically authorized by the [ISSO]. [TOOL:hbss] enforces device control policies for removable media. [TOOL:crowdstrike] detects and alerts on unauthorized removable media usage. Authorized removable media must be [ORG]-owned, encrypted, and scanned before use. Personally-owned removable media is prohibited on [SYSTEM]. Media use policy compliance is reviewed quarterly.`,
    tools:["gpo","hbss","crowdstrike"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PE — PHYSICAL AND ENVIRONMENTAL PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════
  "PE-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a Physical and Environmental Protection Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy is consistent with ICD 705 (for applicable spaces) and [ORG]'s physical security standards. It is reviewed annually. The [ISSO] coordinates with the Physical Security Officer to ensure physical security controls support [SYSTEM] security requirements.`,
    tools:[],
  },
  "PE-2": {
    title:"Physical Access Authorizations",
    body:`Access to [SYSTEM] facilities and data center space is restricted to authorized personnel. Access lists are maintained by the Physical Security Officer and reviewed quarterly by the [ISSO]. Personnel are granted physical access only based on job requirements and appropriate background investigation. Visitor access is controlled via escort procedures. Physical access control logs are maintained and reviewed monthly. The [ISSO] coordinates with the Physical Security Officer to remove access for separated personnel within 24 hours.`,
    tools:[],
  },
  "PE-3": {
    title:"Physical Access Control",
    body:`Physical access to [SYSTEM] facilities is controlled through electronic access control systems using [TOOL:cac] for server rooms and data centers. Entry points are monitored by security cameras with 90-day video retention. Server rooms are secured with two-factor physical authentication. All physical access is logged. Unauthorized access attempts trigger immediate security response. Physical access controls are tested quarterly. The Physical Security Officer coordinates with the [ISSO] on physical security requirements.`,
    tools:["cac"],
  },
  "PE-4": {
    title:"Access Control for Transmission",
    body:`Physical access to [SYSTEM] transmission infrastructure (network cabling, distribution frames, patch panels, wiring closets) is controlled. Telecommunications and data communications infrastructure is protected in locked wiring closets and conduit. [TOOL:juniper] and [TOOL:cisco9300] equipment is secured in locked racks. Cable trays are in secured areas. Physical access to transmission infrastructure is limited to authorized network administrators. Wiring areas are inspected quarterly for unauthorized devices.`,
    tools:["juniper","cisco9300"],
  },
  "PE-5": {
    title:"Access Control for Output Devices",
    body:`[ORG] controls physical access to [SYSTEM] output devices (printers, displays, audio devices) to prevent unauthorized disclosure. Printers containing CUI are located in secured areas accessible only to authorized personnel. Printer output is retrieved immediately. Display screens in public areas use privacy screens. Hardcopy CUI output is controlled per MP-3 marking requirements. The [ISSO] reviews output device placement and controls annually.`,
    tools:[],
  },
  "PE-6": {
    title:"Monitoring Physical Access",
    body:`[ORG] monitors physical access to [SYSTEM] facilities. Security cameras cover all entry/exit points and critical areas. Camera footage is retained for 90 days. Physical access logs are reviewed weekly by security personnel and monthly by the [ISSO]. Anomalous access patterns (after-hours access, multiple failed attempts) trigger security investigations. Physical security monitoring reports are provided to the [ISSM] quarterly. Monitoring systems are tested monthly.`,
    tools:[],
  },
  "PE-8": {
    title:"Visitor Access Records",
    body:`[ORG] maintains visitor access records for [SYSTEM] facilities. Records include: visitor name, organization, purpose, escort identity, date/time of entry/exit, and areas accessed. Records are retained for 3 years. Visitor escorts must have equivalent access authorization. All visitors are escorted at all times within controlled areas. Visitor access records are reviewed monthly by the Physical Security Officer and quarterly by the [ISSO].`,
    tools:[],
  },
  "PE-9": {
    title:"Power Equipment and Cabling",
    body:`[ORG] protects power equipment and power cabling supporting [SYSTEM]. Uninterruptible power supplies (UPS) are installed on all critical [SYSTEM] components providing minimum [UPS RUNTIME] of runtime. Power distribution units (PDUs) are secured in locked racks. Power cabling is routed through protected conduit. Emergency power shutoff procedures are documented and tested annually. [TOOL:server2022] systems are connected to UPS with automatic shutdown capability. Power protection equipment is inspected quarterly.`,
    tools:["server2022"],
  },
  "PE-10": {
    title:"Emergency Shutoff",
    body:`[ORG] maintains emergency power shutoff capability for [SYSTEM] equipment. Emergency shutoff switches are located at [EMERGENCY SHUTOFF LOCATION] and accessible to authorized personnel. Shutoff procedures are documented and tested annually. Automatic transfer switches enable graceful shutdown on power failure. Emergency shutoff procedures include notification to the [ISSO] and [ISSM]. Personnel are trained on emergency shutoff procedures annually.`,
    tools:[],
  },
  "PE-11": {
    title:"Emergency Power",
    body:`[SYSTEM] is supported by emergency power including UPS for short-duration outages and generator for extended outages. UPS systems provide power conditioning and minimum [UPS RUNTIME] runtime for orderly shutdown. Generator provides [GENERATOR RUNTIME] of runtime with fuel resupply capability. Emergency power systems are tested monthly (UPS) and quarterly (generator under load). [TOOL:splunk] monitors power system status with alerting on failures.`,
    tools:["splunk"],
  },
  "PE-12": {
    title:"Emergency Lighting",
    body:`[ORG] provides emergency lighting throughout [SYSTEM] facilities that activates automatically in power outage situations. Emergency lighting covers: entry/exit points, server rooms, wiring closets, and evacuation routes. Emergency lighting is tested monthly and inspected annually. Battery backup is provided for a minimum of 90 minutes per NFPA 101. The Physical Security Officer coordinates emergency lighting maintenance.`,
    tools:[],
  },
  "PE-13": {
    title:"Fire Protection",
    body:`[ORG] employs fire suppression and detection devices for [SYSTEM] facilities. Server rooms are equipped with FM-200 or equivalent clean agent fire suppression. Smoke/heat detectors provide early warning with automated notification to building security and fire department. Fire suppression systems are inspected and tested annually per NFPA 72 and NFPA 2001. Fire extinguishers are inspected monthly. Personnel are trained on fire safety procedures annually. Fire protection systems are coordinated with the [ISSM] to minimize impact on [SYSTEM] availability.`,
    tools:[],
  },
  "PE-14": {
    title:"Environmental Controls",
    body:`[SYSTEM] facilities maintain environmental controls appropriate for IT equipment. Server rooms maintain temperature between 65-75°F (18-24°C) and relative humidity between 40-60% per ASHRAE guidelines. Environmental monitoring systems provide real-time data and alerts for out-of-range conditions. [TOOL:splunk] ingests environmental monitoring alerts. Redundant HVAC units ensure cooling during maintenance. Environmental controls are tested quarterly and maintained per manufacturer specifications.`,
    tools:["splunk"],
  },
  "PE-15": {
    title:"Water Damage Protection",
    body:`[ORG] protects [SYSTEM] from water damage. Server rooms are not located below grade or in flood-prone areas. Water detection sensors are installed under raised floors and near ceiling penetrations with alerts to facilities management. Overhead plumbing is avoided above server racks where possible. Shutoff valves are documented and accessible. Water damage protection measures are reviewed annually during physical security inspections.`,
    tools:[],
  },
  "PE-16": {
    title:"Delivery and Removal",
    body:`[ORG] controls the delivery and removal of [SYSTEM] components. All deliveries to [SYSTEM] facilities are documented in a receiving log. IT equipment is verified against purchase orders before acceptance. Equipment removed from the facility is documented and authorized by the [ISSO]. Suppliers are vetted per supply chain risk management procedures (SR-3). [TOOL:acas] scans new equipment before production deployment. Removal of [SYSTEM] equipment requires [ISSO] authorization and is logged.`,
    tools:["acas"],
  },
  "PE-17": {
    title:"Alternate Work Site",
    body:`[ORG] provides security controls for personnel working at alternate work sites (telework, home office). Remote workers must use [TOOL:ivanti] VPN with [TOOL:cac] authentication. [TOOL:zscaler] provides endpoint security for remote workers. [TOOL:crowdstrike] is deployed on all authorized telework endpoints. Remote work is authorized by the [ISSO] with documentation of the remote workspace security measures. Remote worker security requirements are documented in [ORG]'s telework policy reviewed annually.`,
    tools:["ivanti","cac","zscaler","crowdstrike"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PL — PLANNING
  // ═══════════════════════════════════════════════════════════════════════════
  "PL-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a Planning Policy addressing the SSP, rules of behavior, and privacy plan requirements. The policy is consistent with DoDI 8510.01 and NIST SP 800-18. It is reviewed annually. The [ISSM] is responsible for the planning program for [SYSTEM].`,
    tools:[],
  },
  "PL-2": {
    title:"System Security and Privacy Plans",
    body:`[ORG] develops, documents, and maintains a System Security Plan (SSP) for [SYSTEM]. The SSP describes: system boundary, security categorization, information types, operational environment, connections to other systems, security control implementation, and personnel responsibilities. The SSP is maintained in [TOOL:emass] and reviewed and updated annually or when significant changes occur. The SSP is approved by the [AO]. The [ISSO] is responsible for SSP maintenance. The SSP is protected from unauthorized access as a sensitive document.`,
    tools:["emass"],
  },
  "PL-4": {
    title:"Rules of Behavior",
    body:`[ORG] establishes and documents Rules of Behavior (ROB) for [SYSTEM] that describe responsibilities and expected behavior for personnel with access to the system. The ROB covers: acceptable use, password requirements, CUI handling, incident reporting, consequences of non-compliance, and prohibition of personal use for unauthorized purposes. All personnel with access to [SYSTEM] acknowledge and sign the ROB before account creation and annually thereafter. Signed ROBs are maintained by the [ISSO] for the duration of access plus 3 years.`,
    tools:[],
  },
  "PL-8": {
    title:"Security and Privacy Architectures",
    body:`[ORG] develops a security architecture for [SYSTEM] that describes the overall philosophy, requirements, and approach to protecting CUI. The architecture is documented in the SSP and network/boundary diagrams maintained in [TOOL:emass]. The architecture reflects: defense-in-depth using [TOOL:paloalto] at the perimeter, [TOOL:crowdstrike] for endpoint protection, [TOOL:splunk] for monitoring, and [TOOL:cac] for authentication. The architecture is reviewed annually and updated to reflect changes. The [ISSO] ensures architecture decisions are reflected in implemented controls.`,
    tools:["emass","paloalto","crowdstrike","splunk","cac"],
  },
  "PL-10": {
    title:"Baseline Selection",
    body:`[ORG] selects a security control baseline for [SYSTEM] commensurate with the system's security categorization. [SYSTEM] is categorized at [SECURITY CATEGORIZATION - e.g., MODERATE/HIGH] per FIPS 199 and CNSSI 1253. The baseline control set is selected from NIST SP 800-53 Rev 5 and tailored per DoD overlays. Tailoring decisions are documented in the SSP and approved by the [AO]. The control baseline is reviewed during annual security reviews and when the system categorization changes.`,
    tools:[],
  },
  "PL-11": {
    title:"Baseline Tailoring",
    body:`[ORG] tailors the selected control baseline for [SYSTEM] based on organizational and system-specific conditions. Tailoring decisions are documented in the SSP with supporting rationale. Controls are added where organizational risk requires additional protection beyond the baseline. Controls are removed only with [AO] approval and documented risk acceptance. DoD overlays and applicable DISA STIGs are applied as part of the tailoring process. Tailoring decisions are reviewed annually by the [ISSO] and [ISSM].`,
    tools:[],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PM — PROGRAM MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  "PM-1": {
    title:"Information Security Program Plan",
    body:`[ORG] develops and maintains an organization-wide Information Security Program Plan that provides an overview of requirements and describes the program for meeting those requirements. The program plan is reviewed and updated annually. The [ISSM] is responsible for the program plan. The plan is consistent with DoDI 8500.01 and applicable OMB policy. Program plan implementation status is reported to organizational leadership annually.`,
    tools:[],
  },
  "PM-2": {
    title:"Information Security Program Leadership Role",
    body:`[ORG] designates a senior official with the mission and resources to coordinate, develop, implement, and maintain an organization-wide information security program. The [ISSM] serves as the senior security official for [SYSTEM]. The [ISSM] has direct access to organizational leadership and coordinates with the [AO] on authorization decisions. The [ISSM] responsibilities and authorities are documented in [ORG]'s security management charter.`,
    tools:[],
  },
  "PM-3": {
    title:"Information Security and Privacy Resources",
    body:`[ORG] includes information security resources in capital planning and investment requests. Security resources for [SYSTEM] include: [TOOL:acas]/[TOOL:tenablesc] licensing, [TOOL:crowdstrike] licensing, [TOOL:hbss] HBSS licensing, [TOOL:splunk] licensing, personnel (ISSO/ISSM), and training. Security costs are documented in [ORG]'s annual budget submission. The [ISSM] participates in the capital planning process to ensure security requirements are funded.`,
    tools:["acas","tenablesc","crowdstrike","hbss","splunk"],
  },
  "PM-4": {
    title:"Plan of Action and Milestones Process",
    body:`[ORG] implements a POAM process for [SYSTEM] that identifies deficiencies, assigns responsibility, establishes timelines, and tracks remediation. The POAM is maintained in [TOOL:emass]. The [ISSO] updates the POAM monthly. The [ISSM] reviews the POAM quarterly. The [AO] accepts the POAM annually. POAM items are prioritized by risk level (CAT I: 30 days, CAT II: 90 days, CAT III: 180 days). POAM reporting is integrated with the continuous monitoring program.`,
    tools:["emass"],
  },
  "PM-5": {
    title:"System Inventory",
    body:`[ORG] maintains an inventory of all information systems including [SYSTEM]. The system inventory includes: system name, owner, security categorization, ATO status, ATO expiration, primary location, and interconnections. The inventory is maintained in [TOOL:emass] and updated whenever systems are added, modified, or decommissioned. The [ISSM] reviews the system inventory quarterly. The inventory supports annual security program reporting to organizational leadership.`,
    tools:["emass"],
  },
  "PM-6": {
    title:"Measures of Performance",
    body:`[ORG] develops, monitors, and reports on measures of performance for the information security program covering [SYSTEM]. Performance measures include: POAM closure rates, vulnerability remediation timelines, training completion rates, audit log review compliance, and incident response times. Metrics are collected monthly and reported to the [ISSM] quarterly. The [ISSM] reports program performance to organizational leadership annually. Metrics inform resource allocation and program improvement decisions.`,
    tools:["emass"],
  },
  "PM-9": {
    title:"Risk Management Strategy",
    body:`[ORG] develops and maintains a risk management strategy for [SYSTEM] that addresses: risk tolerance, risk framing, risk assessment methodology, risk response options, and risk monitoring approach. The strategy is consistent with NIST SP 800-39 and DoD risk management guidance. Risk decisions are documented with supporting rationale. The [ISSM] implements the risk management strategy. The [AO] accepts residual risk documented in the authorization decision. The strategy is reviewed annually.`,
    tools:[],
  },
  "PM-10": {
    title:"Authorization Process",
    body:`[ORG] manages the authorization process for [SYSTEM] per DoDI 8510.01 and CSRMC. The [ISSM] coordinates the authorization package development. The [AO] reviews the SSP, SAR, and POAM and issues the authorization decision. The authorization package is maintained in [TOOL:emass]. Reauthorization is initiated 6 months before expiration. The authorization process supports the cATO objective through continuous monitoring. Authorization decisions are documented and retained for 3 years.`,
    tools:["emass"],
  },
  "PM-11": {
    title:"Mission and Business Process Definition",
    body:`[ORG] defines mission and business processes for [SYSTEM] that incorporate information security and privacy requirements. Mission criticality is considered in security categorization and control selection decisions. The [ISSM] ensures mission requirements are balanced with security controls. Mission and business process documentation is maintained in the SSP and reviewed annually. Security requirements are integrated into [SYSTEM]'s system development lifecycle per SA-3.`,
    tools:[],
  },
  "PM-14": {
    title:"Testing, Training, and Monitoring",
    body:`[ORG] implements a strategy for testing, training, and monitoring the information security program for [SYSTEM]. Testing includes annual penetration testing and contingency plan exercises. Training includes security awareness (AT-2) and role-based training (AT-3). Monitoring includes continuous monitoring per CA-7 using [TOOL:acas], [TOOL:crowdstrike], and [TOOL:splunk]. The [ISSM] coordinates TTM activities and reports outcomes to the [AO] annually.`,
    tools:["acas","crowdstrike","splunk"],
  },
  "PM-16": {
    title:"Threat Awareness Program",
    body:`[ORG] implements a threat awareness program for [SYSTEM] that includes: threat intelligence subscription from [TOOL:crowdstrike] Threat Intelligence, CISA alerts and advisories, US-CERT notifications, and DoD Cyber threat briefings. Threat information is shared with the [ISSO], [ISSM], and system administrators. [TOOL:splunk] correlates threat indicators against [SYSTEM] logs. The [ISSO] reviews threat intelligence weekly and briefs the [ISSM] monthly. Threats relevant to [SYSTEM] are incorporated into risk assessments and drive proactive defensive measures.`,
    tools:["crowdstrike","splunk"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PS — PERSONNEL SECURITY
  // ═══════════════════════════════════════════════════════════════════════════
  "PS-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a Personnel Security Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy is consistent with DoDI 5200.02 and applicable DoD personnel security policy. It requires background investigation commensurate with access level. The policy is reviewed annually. The [ISSM] coordinates with the Personnel Security Officer on personnel security requirements for [SYSTEM].`,
    tools:[],
  },
  "PS-2": {
    title:"Position Risk Designation",
    body:`[ORG] assigns risk designations to all positions with access to [SYSTEM]. Positions are designated based on the sensitivity of data accessed and the potential for harm. [SYSTEM] positions require minimum [CLEARANCE LEVEL] security clearance with access to [SYSTEM]. Position risk designations are documented in position descriptions and reviewed when positions change. The Personnel Security Officer coordinates with the [ISSO] on risk designation requirements for [SYSTEM] access.`,
    tools:[],
  },
  "PS-3": {
    title:"Personnel Screening",
    body:`[ORG] screens individuals prior to authorizing access to [SYSTEM]. All personnel with access to [SYSTEM] must have a minimum [CLEARANCE LEVEL] security clearance from DCSA or appropriate clearance authority. Background investigations are commensurate with the risk designation of the position. The [ISSO] verifies clearance status before creating [SYSTEM] accounts. Clearance status is reverified annually. The Personnel Security Officer notifies the [ISSO] immediately of clearance revocations or adverse actions.`,
    tools:[],
  },
  "PS-4": {
    title:"Personnel Termination",
    body:`[ORG] terminates [SYSTEM] access for personnel upon separation from the organization or reassignment away from [SYSTEM]. The [ISSO] disables accounts within 24 hours of notification of separation. [TOOL:ad] accounts are disabled and credentials invalidated. [TOOL:cac] access is revoked via DoD PKI revocation. [TOOL:ivanti] VPN access is removed. Separation checklists ensure all access is revoked. The [ISSO] conducts exit interviews emphasizing data handling responsibilities. Separation notifications are sent to the [ISSM].`,
    tools:["ad","cac","ivanti"],
  },
  "PS-5": {
    title:"Personnel Transfer",
    body:`[ORG] reviews [SYSTEM] access authorizations when personnel are transferred or reassigned. The [ISSO] reviews and adjusts access within 5 business days of notification. Accounts no longer needed are disabled. Access is updated to reflect new role requirements (least privilege). [TOOL:ad] group memberships are updated per new role. The [ISSO] documents access changes and notifies the [ISSM] of significant access modifications.`,
    tools:["ad"],
  },
  "PS-6": {
    title:"Access Agreements",
    body:`[ORG] requires individuals with access to [SYSTEM] to sign access agreements including Rules of Behavior (ROB) and appropriate Non-Disclosure Agreements (NDAs). Access agreements are signed before account creation and annually thereafter. Signed agreements are maintained by the [ISSO] for duration of access plus 3 years. Access is revoked for personnel who refuse to sign or who violate access agreement terms. The [ISSO] tracks access agreement compliance and reports to the [ISSM] quarterly.`,
    tools:[],
  },
  "PS-7": {
    title:"External Personnel Security",
    body:`[ORG] establishes personnel security requirements for external service providers supporting [SYSTEM] including contractors and vendors. Contractors must have appropriate security clearances verified by the [ISSO] before access. Contractor access is limited to the scope of the service contract. [TOOL:cac]-based authentication is required for contractor accounts. Contractor accounts are reviewed quarterly and removed upon contract completion. Contractor access is subject to the same security requirements as government personnel.`,
    tools:["cac"],
  },
  "PS-8": {
    title:"Personnel Sanctions",
    body:`[ORG] employs a formal sanctions process for personnel who violate [SYSTEM] security policies. Violations are reported to the individual's supervisor and the [ISSM]. Sanctions range from verbal counseling to termination depending on severity. Security violations are documented and factored into future access authorization decisions. The [ISSO] maintains a log of security violations and sanctions for [SYSTEM]. Repeated violations result in immediate access revocation pending investigation.`,
    tools:[],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RA — RISK ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════
  "RA-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a Risk Assessment Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy is consistent with NIST SP 800-30 and DoD risk management guidance. It requires annual risk assessments for [SYSTEM]. The policy is reviewed annually. The [ISSO] is responsible for conducting risk assessments for [SYSTEM] in coordination with the [ISSM].`,
    tools:[],
  },
  "RA-2": {
    title:"Security Categorization",
    body:`[SYSTEM] has been categorized per FIPS 199 and CNSSI 1253 as [SECURITY CATEGORIZATION]. The categorization considers the potential impact of confidentiality, integrity, and availability losses on organizational operations, assets, and individuals. Information types processed by [SYSTEM] include [INFORMATION TYPES]. The categorization is documented in the SSP maintained in [TOOL:emass] and reviewed annually or when significant changes occur. The [AO] approved the security categorization as part of the authorization decision.`,
    tools:["emass"],
  },
  "RA-3": {
    title:"Risk Assessment",
    body:`[ORG] conducts risk assessments for [SYSTEM] annually and after significant changes. Risk assessments incorporate: [TOOL:acas]/[TOOL:tenablesc] vulnerability data, [TOOL:scap] STIG compliance results, [TOOL:crowdstrike] threat intelligence, penetration test findings, and continuous monitoring data from [TOOL:splunk]. Risks are assessed using NIST SP 800-30 methodology. Results are documented and provided to the [ISSM] and [AO]. Identified risks drive POAM entries in [TOOL:emass]. Risk assessment results are incorporated into the authorization decision.`,
    tools:["acas","tenablesc","scap","crowdstrike","splunk","emass"],
  },
  "RA-5": {
    title:"Vulnerability Monitoring and Scanning",
    body:`Vulnerability scanning for [SYSTEM] uses [TOOL:acas] managed by [TOOL:tenablesc]: weekly network/OS scans, monthly database scans, quarterly web application scans. Authenticated scanning maximizes coverage. Results are reviewed by the [ISSO] within 5 business days. CAT I findings are remediated within 30 days; CAT II within 90 days; CAT III within 180 days. Unresolved findings are documented in the POAM in [TOOL:emass]. [TOOL:scap] provides quarterly STIG compliance scanning. [TOOL:crowdstrike] Spotlight provides continuous CVE-to-asset mapping. Patches are managed via [TOOL:wsus].`,
    tools:["acas","tenablesc","emass","scap","crowdstrike","wsus","stig"],
  },
  "RA-7": {
    title:"Risk Response",
    body:`[ORG] responds to identified risks to [SYSTEM] through a structured risk response process. Risk response options include: accept, avoid, mitigate, share, or transfer. Risk acceptance decisions are documented and approved by the [AO]. Mitigation actions are tracked in the POAM in [TOOL:emass]. Risk response decisions consider cost-benefit analysis and mission requirements. The [ISSM] reviews risk response decisions quarterly. Residual risk is documented in the authorization decision.`,
    tools:["emass"],
  },
  "RA-9": {
    title:"Criticality Analysis",
    body:`[ORG] identifies critical [SYSTEM] components and functions through a criticality analysis. Critical components are identified based on: mission impact of failure, difficulty of replacement, supply chain risk, and adversary targeting value. Critical components include: [CRITICAL COMPONENTS - e.g., authentication servers, key management systems, boundary protection devices]. Criticality analysis results inform security control selection, supply chain risk management, and contingency planning. Analysis is reviewed annually and when significant changes occur.`,
    tools:[],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SA — SYSTEM AND SERVICES ACQUISITION
  // ═══════════════════════════════════════════════════════════════════════════
  "SA-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a System and Services Acquisition Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy is consistent with DoDI 5000.02 and applicable acquisition regulations. It requires security considerations in all acquisition decisions for [SYSTEM]. The policy is reviewed annually. The [ISSM] coordinates with the contracting officer on security requirements for [SYSTEM] acquisitions.`,
    tools:[],
  },
  "SA-2": {
    title:"Allocation of Resources",
    body:`[ORG] determines information security requirements for [SYSTEM] as part of the mission and business process planning. Security resources are included in capital planning. Security costs for [SYSTEM] include: [TOOL:acas]/[TOOL:tenablesc] licensing, [TOOL:crowdstrike] licensing, [TOOL:hbss] HBSS licensing, [TOOL:splunk] licensing, personnel costs, and training costs. Security investment decisions are documented in the program budget. The [ISSM] participates in annual budget reviews to ensure security requirements are funded.`,
    tools:["acas","tenablesc","crowdstrike","hbss","splunk"],
  },
  "SA-3": {
    title:"System Development Life Cycle",
    body:`[ORG] manages [SYSTEM] using a system development life cycle (SDLC) that incorporates information security considerations. Security is integrated from the Design phase through Operations consistent with CSRMC phases. The [ISSO] participates in SDLC reviews at each phase gate. Security requirements are documented before development begins. Security testing occurs before production deployment. The [ISSO] conducts security impact analysis for all proposed changes per CM-4. SDLC documentation is maintained in [TOOL:emass].`,
    tools:["emass"],
  },
  "SA-4": {
    title:"Acquisition Process",
    body:`[ORG] includes security requirements in all contracts and acquisition documents for [SYSTEM] components and services. Contract requirements include: security control compliance, supply chain risk management, vulnerability disclosure, incident reporting, and rights to assessment. [TOOL:crowdstrike], [TOOL:hbss], [TOOL:acas], and [TOOL:tenablesc] contracts include security and privacy requirements. The contracting officer coordinates with the [ISSM] to ensure security requirements are included. Contract deliverables include security documentation reviewed by the [ISSO].`,
    tools:["crowdstrike","hbss","acas","tenablesc"],
  },
  "SA-5": {
    title:"System Documentation",
    body:`[ORG] obtains and maintains documentation for [SYSTEM] components including: administrator and user guides, security configuration documentation, DISA STIG checklists for [TOOL:win11], [TOOL:server2022], [TOOL:paloalto], [TOOL:juniper], [TOOL:cisco9300], [TOOL:ivanti], and vendor security advisories. Documentation is maintained in [ORG]'s document management system. The [ISSO] reviews documentation completeness annually. Documentation gaps are identified and addressed through vendor support agreements.`,
    tools:["win11","server2022","paloalto","juniper","cisco9300","ivanti"],
  },
  "SA-8": {
    title:"Security and Privacy Engineering Principles",
    body:`[ORG] applies security engineering principles in the design, development, implementation, and modification of [SYSTEM]. Principles applied include: least privilege (AC-6), defense in depth ([TOOL:paloalto] + [TOOL:crowdstrike] + [TOOL:hbss] + [TOOL:splunk] layered controls), fail secure (deny-all default [TOOL:paloalto] policy), separation of duties (AC-5), and economy of mechanism. Security architecture decisions are documented in the SSP. The [ISSO] reviews architecture for adherence to security engineering principles during significant changes.`,
    tools:["paloalto","crowdstrike","hbss","splunk"],
  },
  "SA-9": {
    title:"External System Services",
    body:`[ORG] requires external service providers supporting [SYSTEM] to comply with applicable security requirements. External services include: [TOOL:crowdstrike] (cloud-delivered EDR), [TOOL:zscaler] (cloud web proxy), [TOOL:tenablesc] (vulnerability management), and [TOOL:ivanti] (VPN). Service provider security requirements are documented in contracts and service level agreements. The [ISSO] reviews external provider security documentation annually (FedRAMP authorizations, SOC 2 reports). Provider security performance is monitored via [TOOL:splunk].`,
    tools:["crowdstrike","zscaler","tenablesc","ivanti","splunk"],
  },
  "SA-10": {
    title:"Developer Configuration Management",
    body:`[ORG] requires developers of [SYSTEM] to manage and control changes during system design, development, implementation, and operation. Developer CM requirements include: version control, change tracking, integrity checking, and security flaw tracking. [TOOL:crowdstrike] is deployed in development environments. Developers use separate development, test, and production environments. Security findings identified during development are tracked and remediated before production deployment. Developer CM practices are reviewed annually by the [ISSO].`,
    tools:["crowdstrike"],
  },
  "SA-11": {
    title:"Developer Testing and Evaluation",
    body:`[ORG] requires developers to implement security testing throughout the [SYSTEM] development lifecycle. Testing requirements include: unit testing, integration testing, system testing, and security-focused testing. [TOOL:acas] scans are conducted on new or modified systems before production deployment. STIG compliance is validated via [TOOL:scap] before deployment. Penetration testing is conducted before major releases. Test results are reviewed by the [ISSO] before deployment authorization. Security deficiencies identified during testing are tracked in the POAM in [TOOL:emass].`,
    tools:["acas","scap","emass"],
  },
  "SA-15": {
    title:"Development Process, Standards, and Tools",
    body:`[ORG] requires development processes, standards, and tools for [SYSTEM] to include security considerations. Development standards include: secure coding practices, prohibited function lists, and security review gates. [TOOL:crowdstrike] is deployed in CI/CD pipelines for build-time security scanning where applicable. Development tools are reviewed for security vulnerabilities before use. The [ISSO] reviews development standards annually for compliance with DoD secure software guidance.`,
    tools:["crowdstrike"],
  },
  "SA-16": {
    title:"Developer-Provided Training",
    body:`[ORG] requires developers of [SYSTEM] components to provide training on the correct use and operation of security functions. Training requirements are included in contracts for [TOOL:crowdstrike], [TOOL:splunk], [TOOL:acas]/[TOOL:tenablesc], [TOOL:paloalto], and [TOOL:ivanti]. Administrator training ensures security features are properly configured and utilized. Training completion is tracked and reported to the [ISSM]. The [ISSO] verifies administrator training before system administration access is granted.`,
    tools:["crowdstrike","splunk","acas","tenablesc","paloalto","ivanti"],
  },
  "SA-17": {
    title:"Developer Security and Privacy Architecture and Design",
    body:`[ORG] requires developers to produce a design specification and security architecture for [SYSTEM] that demonstrates how security requirements are met. Architecture documentation includes: system boundary, data flows, authentication mechanisms, encryption implementation, and security control mapping. The [ISSO] reviews architecture documentation before deployment. Architecture reviews are conducted during annual assessments. Security architecture documentation is maintained in the SSP in [TOOL:emass].`,
    tools:["emass"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SC — SYSTEM AND COMMUNICATIONS PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════
  "SC-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a System and Communications Protection Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy is consistent with NIST SP 800-53 Rev 5, DoDI 8500.01, and applicable DISA STIGs. It is reviewed annually. The [ISSO] is responsible for implementing system and communications protection controls.`,
    tools:[],
  },
  "SC-2": {
    title:"Separation of System and User Functionality",
    body:`[SYSTEM] separates user functionality from system management functionality. Administrative interfaces are separate from user interfaces. System administrators access management functions through dedicated administrative accounts ([TOOL:ad] privileged accounts) separate from standard user accounts. [TOOL:paloalto] management interfaces are on a dedicated management network segment. [TOOL:cisco9300] and [TOOL:juniper] management access is restricted to a dedicated management VLAN. Administrative access is logged to [TOOL:splunk] and reviewed monthly by the [ISSO].`,
    tools:["ad","paloalto","cisco9300","juniper","splunk"],
  },
  "SC-3": {
    title:"Security Function Isolation",
    body:`[SYSTEM] isolates security functions from non-security functions. [TOOL:paloalto] security functions operate independently of user traffic. [TOOL:crowdstrike] operates at the kernel level isolated from user applications. [TOOL:hbss] security functions are protected from user modification via [TOOL:gpo]. [TOOL:splunk] log data is write-protected from operational staff. Security function isolation is validated via [TOOL:stig] compliance checks.`,
    tools:["paloalto","crowdstrike","hbss","gpo","splunk","stig"],
  },
  "SC-4": {
    title:"Information in Shared System Resources",
    body:`[SYSTEM] prevents unauthorized and unintended information transfer via shared system resources. Windows systems use memory management and process isolation to prevent cross-process information leakage ([TOOL:gpo] enforces memory protection settings). [TOOL:crowdstrike] monitors for information leakage via shared resources. Virtualization environments (where applicable) use hypervisor-level isolation. Shared storage is access-controlled via [TOOL:ad] permissions. Resource isolation compliance is validated via [TOOL:stig] quarterly.`,
    tools:["gpo","crowdstrike","ad","stig"],
  },
  "SC-5": {
    title:"Denial-of-Service Protection",
    body:`[SYSTEM] protects against denial-of-service (DoS) attacks through multiple mechanisms. [TOOL:paloalto] implements DoS protection policies including rate limiting, SYN flood protection, and anomaly detection. [TOOL:zscaler] provides DDoS protection for web-facing services. [TOOL:juniper] implements upstream rate limiting and traffic shaping. DoS events are detected and logged to [TOOL:splunk] with automated alerting. DoS protection configurations comply with DISA STIG requirements validated quarterly.`,
    tools:["paloalto","zscaler","juniper","splunk","stig"],
  },
  "SC-7": {
    title:"Boundary Protection",
    body:`[SYSTEM] boundary protection is implemented through [TOOL:paloalto] next-generation firewalls enforcing deny-all/permit-by-exception at the perimeter. [TOOL:zscaler] provides cloud-based proxy and SSL inspection for outbound web traffic. [TOOL:ivanti] controls all remote access. [TOOL:juniper] enforces ACLs at the network edge. [TOOL:cisco9300] enforces VLAN segmentation internally. [TOOL:dns] servers are secured to prevent exfiltration. Traffic is logged to [TOOL:splunk]. Boundary protection complies with DISA STIGs, validated via [TOOL:stig] quarterly. [TOOL:acas] validates external-facing services.`,
    tools:["paloalto","zscaler","ivanti","juniper","cisco9300","dns","splunk","stig","acas"],
  },
  "SC-8": {
    title:"Transmission Confidentiality and Integrity",
    body:`[SYSTEM] uses cryptographic mechanisms to protect transmission confidentiality and integrity. TLS 1.2 or higher is enforced for all web communications. [TOOL:paloalto] enforces TLS inspection policies. [TOOL:ivanti] VPN uses AES-256 encryption. [TOOL:zscaler] enforces HTTPS inspection. FIPS 140-2 cryptographic modules are used on Windows systems via [TOOL:gpo]. SSH v2 is required for administrative sessions. Legacy protocols (SSL, TLS 1.0/1.1) are disabled. Compliance is validated via [TOOL:scap] and [TOOL:stig].`,
    tools:["paloalto","ivanti","zscaler","gpo","scap","stig"],
  },
  "SC-10": {
    title:"Network Disconnect",
    body:`[SYSTEM] terminates network connections after a period of inactivity or at the end of sessions. [TOOL:ivanti] VPN sessions are terminated after [SESSION TIMEOUT] minutes of inactivity. [TOOL:paloalto] firewall sessions are terminated based on timeout policies. Windows remote desktop sessions are disconnected after [RDP TIMEOUT] minutes of inactivity via [TOOL:gpo]. Network device administrative sessions time out after 10 minutes of inactivity per DISA STIG requirements. Session termination is logged to [TOOL:splunk].`,
    tools:["ivanti","paloalto","gpo","splunk","stig"],
  },
  "SC-12": {
    title:"Cryptographic Key Establishment and Management",
    body:`[SYSTEM] establishes and manages cryptographic keys per NIST SP 800-57. PKI keys are managed through the DoD PKI infrastructure via [TOOL:cac] certificates. [TOOL:ivanti] VPN certificate lifecycle is managed by [ORG]'s PKI administrator. Certificate expiration monitoring is conducted by the [ISSO] with 90-day advance notification. Expired certificates are renewed before expiration. Key management procedures comply with DoD PKI policy and FIPS 140-2 requirements.`,
    tools:["cac","ivanti"],
  },
  "SC-13": {
    title:"Cryptographic Protection (FIPS)",
    body:`[SYSTEM] implements FIPS 140-2 validated cryptographic protection. FIPS mode is enabled via [TOOL:gpo] on all [TOOL:win11] and Windows Server systems. [TOOL:cac] uses FIPS-validated cryptographic modules (RSA-2048/ECDSA P-256). [TOOL:ivanti] uses FIPS-validated algorithms. FIPS compliance is validated via [TOOL:scap] and [TOOL:stig] quarterly. Non-FIPS algorithms are disabled via [TOOL:gpo]. FIPS-compliant algorithms include: AES-256, SHA-256/384, RSA-2048+, ECDSA, Triple-DES (legacy only).`,
    tools:["gpo","win11","server2016","server2019","server2022","cac","ivanti","scap","stig"],
  },
  "SC-15": {
    title:"Collaborative Computing Devices and Applications",
    body:`[SYSTEM] prohibits remote activation of collaborative computing devices including cameras and microphones except where explicitly authorized for official use. [TOOL:gpo] disables camera and microphone access on [TOOL:win11] workstations in secure areas per DISA STIG. Collaboration tools (video conferencing, screen sharing) require [ISSO] authorization before deployment on [SYSTEM] networks. Physical privacy screens are used on workstations in shared spaces. Collaborative computing device policies are validated via [TOOL:stig] checklists.`,
    tools:["gpo","win11","stig"],
  },
  "SC-17": {
    title:"Public Key Infrastructure Certificates",
    body:`[SYSTEM] uses PKI certificates issued by the DoD CA hierarchy via [TOOL:cac] for user authentication. Server certificates are issued by [ORG]'s internal CA or DoD PKI for server authentication. Certificate policies enforce: minimum key sizes (RSA-2048, ECDSA P-256), validity periods, and certificate revocation checking via OCSP/CRL. The [ISSO] monitors certificate expiration and renews certificates 90 days before expiration. [TOOL:acas] scans detect expired or weak certificates. PKI implementation complies with DoD PKI policy.`,
    tools:["cac","acas"],
  },
  "SC-18": {
    title:"Mobile Code",
    body:`[SYSTEM] restricts and monitors mobile code. [TOOL:paloalto] enforces application-layer policies filtering mobile code. [TOOL:zscaler] provides web content inspection blocking malicious mobile code. [TOOL:hbss] provides host-based protection against malicious mobile code. [TOOL:gpo] configures Internet Explorer/Edge security zones restricting mobile code execution. Approved mobile code technologies are documented. Mobile code restrictions are validated via [TOOL:stig] compliance checks quarterly.`,
    tools:["paloalto","zscaler","hbss","gpo","stig"],
  },
  "SC-19": {
    title:"Voice Over Internet Protocol",
    body:`[SYSTEM] establishes usage restrictions and implementation guidance for VoIP technologies. VoIP traffic is isolated on a separate VLAN via [TOOL:cisco9300]. [TOOL:paloalto] enforces QoS and security policies for VoIP traffic. VoIP systems are included in the [SYSTEM] boundary if used for sensitive communications. VoIP configuration complies with applicable DISA STIGs validated via [TOOL:stig] checklists. VoIP usage on classified networks complies with NSA guidance.`,
    tools:["cisco9300","paloalto","stig"],
  },
  "SC-20": {
    title:"Secure Name/Address Resolution Service (Authoritative)",
    body:`[SYSTEM] provides authoritative DNS resolution with integrity protections. [TOOL:dns] servers are configured with DNSSEC where applicable to provide source authentication and data integrity. DNS queries and responses are logged to [TOOL:splunk]. [TOOL:paloalto] inspects DNS traffic for malicious activity. [TOOL:zscaler] provides DNS security filtering for client queries. DNS server configurations comply with DISA STIG requirements validated via [TOOL:stig] quarterly. Unauthorized DNS modifications are detected by [TOOL:crowdstrike] and [TOOL:splunk].`,
    tools:["dns","splunk","paloalto","zscaler","crowdstrike","stig"],
  },
  "SC-21": {
    title:"Secure Name/Address Resolution Service (Recursive)",
    body:`[SYSTEM] requests and performs DNS name/address resolution using mechanisms with data origin authentication and data integrity verification. Client systems are configured to use [ORG]'s internal DNS servers secured per DISA STIG. [TOOL:paloalto] blocks DNS queries to unauthorized external resolvers. [TOOL:zscaler] provides DNS security for web-bound queries. DNS over HTTPS (DoH) to unauthorized servers is blocked. DNS client configuration is enforced via [TOOL:gpo] and validated via [TOOL:stig].`,
    tools:["paloalto","zscaler","gpo","stig"],
  },
  "SC-22": {
    title:"Architecture and Provisioning for Name/Address Resolution Service",
    body:`[SYSTEM] ensures DNS infrastructure is resilient and fault-tolerant. Redundant [TOOL:dns] servers are deployed to eliminate single points of failure. Primary and secondary DNS servers are geographically or logically separated. DNS server availability is monitored by [TOOL:splunk] with alerting for service disruption. DNS server configurations are backed up and recoverable per contingency planning procedures. DNS architecture is reviewed annually by the [ISSO] and [ISSM].`,
    tools:["dns","splunk"],
  },
  "SC-23": {
    title:"Session Authenticity",
    body:`[SYSTEM] protects the authenticity of communication sessions. TLS certificates are validated for all HTTPS sessions. [TOOL:paloalto] inspects SSL/TLS sessions for anomalies. [TOOL:ivanti] VPN provides session authentication and integrity. [TOOL:cac] certificates provide user identity binding to sessions. Session tokens are protected via Secure and HttpOnly flags. [TOOL:zscaler] validates server certificates for proxied sessions. Session authenticity mechanisms comply with DISA STIG requirements validated via [TOOL:stig] quarterly.`,
    tools:["paloalto","ivanti","cac","zscaler","stig"],
  },
  "SC-28": {
    title:"Protection of Information at Rest",
    body:`Data at rest is encrypted via BitLocker (AES-256) on [TOOL:win11] workstations and Windows servers enforced by [TOOL:gpo]. Database encryption protects production databases. [TOOL:paloalto] enforces DLP policies. Removable media encryption is enforced via [TOOL:gpo]. [TOOL:crowdstrike] monitors for unencrypted sensitive data. Encryption compliance is validated via [TOOL:scap] and [TOOL:stig] quarterly.`,
    tools:["win11","server2022","gpo","paloalto","crowdstrike","scap","stig"],
  },
  "SC-39": {
    title:"Process Isolation",
    body:`[SYSTEM] maintains a separate execution domain for each executing process. Windows systems use address space layout randomization (ASLR), Data Execution Prevention (DEP), and process isolation enforced via [TOOL:gpo]. [TOOL:crowdstrike] monitors process behavior and prevents process injection attacks. [TOOL:hbss] HIPS prevents malicious process spawning. Virtualization (where used) provides hypervisor-level process isolation. Process isolation compliance is validated via [TOOL:stig] and [TOOL:scap].`,
    tools:["gpo","crowdstrike","hbss","stig","scap"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SI — SYSTEM AND INFORMATION INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════
  "SI-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a System and Information Integrity Policy addressing purpose, scope, roles, responsibilities, and compliance. The policy is consistent with DoDI 8500.01 and NIST SP 800-53 Rev 5. It requires malware protection, vulnerability management, and system monitoring for [SYSTEM]. The policy is reviewed annually. The [ISSO] is responsible for implementing system and information integrity controls.`,
    tools:[],
  },
  "SI-2": {
    title:"Flaw Remediation",
    body:`Flaw remediation is managed through [TOOL:acas]/[TOOL:tenablesc] weekly vulnerability scanning and [TOOL:wsus] patch management. [TOOL:crowdstrike] Spotlight provides continuous CVE mapping. Patches are tested before production deployment. CAT I: 30-day remediation; CAT II: 90-day; CAT III: 180-day. [TOOL:wsus] deploys Microsoft patches to all Windows systems. Patch compliance is reviewed weekly by the [ISSO] and reported to the [ISSM] monthly. Unpatched vulnerabilities are tracked in POAM in [TOOL:emass].`,
    tools:["acas","tenablesc","wsus","crowdstrike","win11","server2016","server2019","server2022","emass"],
  },
  "SI-3": {
    title:"Malicious Code Protection",
    body:`Malicious code protection uses [TOOL:hbss] (Trellix/McAfee ENS) via HBSS ePO for signature-based AV/HIPS on all endpoints. [TOOL:crowdstrike] Falcon provides AI-based behavioral EDR. [TOOL:hbss] updates within 24 hours of new signatures. [TOOL:zscaler] provides malware inspection for web traffic. Detections are logged to [TOOL:splunk] with automated alerting to the [ISSO]. Compliance is validated via [TOOL:stig] and [TOOL:scap] quarterly.`,
    tools:["hbss","crowdstrike","zscaler","splunk","stig","scap"],
  },
  "SI-4": {
    title:"System Monitoring",
    body:`[SYSTEM] is monitored continuously using [TOOL:crowdstrike] Falcon EDR, [TOOL:splunk] SIEM, [TOOL:hbss] HIPS, and [TOOL:zscaler] web proxy monitoring. [TOOL:paloalto] provides network-level monitoring. [TOOL:acas] provides vulnerability-based monitoring. [TOOL:splunk] correlates events with automated alerting for IOCs. The [ISSO] reviews monitoring dashboards daily and investigates high-priority alerts within 4 hours. Monitoring results are reported to the [ISSM] monthly.`,
    tools:["crowdstrike","splunk","hbss","zscaler","paloalto","acas"],
  },
  "SI-5": {
    title:"Security Alerts, Advisories, and Directives",
    body:`[ORG] receives and responds to security alerts, advisories, and directives for [SYSTEM]. Sources include: CISA Alerts and Advisories, US-CERT notifications, DoD Cyber Tasking Orders (CTOs), DISA STIG/IAVA updates, and [TOOL:crowdstrike] threat intelligence. The [ISSO] reviews security advisories weekly and assesses applicability to [SYSTEM]. CISA Binding Operational Directives (BODs) and Emergency Directives are implemented within required timeframes. [TOOL:acas] scans validate remediation of IAVA-related vulnerabilities. Advisory response is documented and reported to the [ISSM].`,
    tools:["crowdstrike","acas"],
  },
  "SI-6": {
    title:"Security and Privacy Function Verification",
    body:`[SYSTEM] verifies the correct operation of security functions. [TOOL:crowdstrike] performs self-diagnostics and reports health status. [TOOL:hbss] provides agent health monitoring through HBSS ePO console. [TOOL:splunk] monitors forwarder health for all log sources. [TOOL:acas] agent health is monitored by [TOOL:tenablesc]. Security function verification occurs: at startup, upon command from authorized administrators, and periodically. Verification failures generate alerts reviewed by the [ISSO] within 4 hours.`,
    tools:["crowdstrike","hbss","splunk","acas","tenablesc"],
  },
  "SI-7": {
    title:"Software, Firmware, and Information Integrity",
    body:`[SYSTEM] employs integrity verification mechanisms to detect unauthorized changes. [TOOL:crowdstrike] monitors file system integrity and detects modifications in real time. [TOOL:hbss] provides host-based integrity monitoring. [TOOL:gpo] enforces code signing for Windows systems. [TOOL:wsus] verifies patch integrity via digital signatures. [TOOL:scap] validates baseline configuration integrity quarterly. Unauthorized changes trigger [TOOL:splunk] alerts investigated within 24 hours.`,
    tools:["crowdstrike","hbss","gpo","wsus","scap","splunk"],
  },
  "SI-8": {
    title:"Spam Protection",
    body:`[SYSTEM] implements spam protection mechanisms at email entry/exit points. Email filtering provides spam and phishing protection for [SYSTEM] users. [TOOL:paloalto] provides mail security inspection for email traffic. [TOOL:zscaler] blocks malicious URLs in email links. Spam protection mechanisms update automatically with new signatures. Spam filtering events are logged to [TOOL:splunk] and reviewed monthly by the [ISSO]. Phishing attempts are reported to the [ISSO] per [ORG]'s reporting procedures.`,
    tools:["paloalto","zscaler","splunk"],
  },
  "SI-10": {
    title:"Information Input Validation",
    body:`[SYSTEM] checks the validity of information inputs to verify accuracy, completeness, validity, and authenticity. Web applications validate all user inputs to prevent injection attacks (SQL injection, XSS, command injection). [TOOL:paloalto] application-aware firewall rules enforce web application input controls. [TOOL:crowdstrike] detects injection attack patterns. [TOOL:acas] scans identify input validation vulnerabilities in web applications. Input validation requirements are documented in development standards and verified during security testing.`,
    tools:["paloalto","crowdstrike","acas"],
  },
  "SI-12": {
    title:"Information Management and Retention",
    body:`[SYSTEM] manages and retains information within the system and output from the system in accordance with applicable laws, executive orders, directives, policies, regulations, standards, guidelines, and operational requirements. CUI is retained per applicable CUI category retention schedules. Audit logs are retained per AU-11 requirements. System documentation is retained per NARA General Records Schedules. The [ISSO] coordinates with [ORG]'s records manager on retention requirements. Data at end of retention is disposed of per MP-6 sanitization procedures.`,
    tools:[],
  },
  "SI-16": {
    title:"Memory Protection",
    body:`[SYSTEM] implements memory protection mechanisms to guard against unauthorized code execution. Windows systems implement ASLR and DEP enforced via [TOOL:gpo]. [TOOL:crowdstrike] provides exploit prevention and memory protection at the kernel level. [TOOL:hbss] HIPS monitors for memory injection attacks. Secure Boot is enabled on [TOOL:win11] and server systems to prevent firmware-level attacks. Memory protection configurations are validated via [TOOL:stig] and [TOOL:scap] quarterly.`,
    tools:["gpo","crowdstrike","hbss","win11","stig","scap"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SR — SUPPLY CHAIN RISK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  "SR-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated a Supply Chain Risk Management Policy consistent with NIST SP 800-161 and DoD supply chain risk management directives. The policy addresses purpose, scope, roles, responsibilities, and compliance. It is reviewed annually. The [ISSM] is responsible for the supply chain risk management program. The policy applies to all hardware, software, and services procured for [SYSTEM].`,
    tools:[],
  },
  "SR-2": {
    title:"Supply Chain Risk Management Plan",
    body:`[ORG] maintains a Supply Chain Risk Management Plan (SCRM Plan) for [SYSTEM] per NIST SP 800-161. The plan identifies: critical system components, primary and backup suppliers, supply chain risks, and risk mitigation strategies. Critical components are assessed for supply chain risk before procurement. Software is verified for integrity before deployment. The SCRM Plan is reviewed annually and updated when significant changes occur. The [ISSM] and [AO] have reviewed and accepted residual supply chain risk. The SCRM Plan is maintained in [TOOL:emass].`,
    tools:["emass","acas"],
  },
  "SR-3": {
    title:"Supply Chain Controls and Processes",
    body:`[ORG] establishes a process for identifying and addressing weaknesses or deficiencies in the supply chain elements and processes for [SYSTEM]. Controls include: vendor vetting, hardware authenticity verification, software integrity checking, and tamper-evident packaging requirements. [TOOL:acas] scans new hardware before production deployment to identify known vulnerabilities. Software provenance is verified via digital signatures before installation. Supply chain incidents are reported to the [ISSO] and [ISSM]. Supplier security assessments are conducted for critical suppliers.`,
    tools:["acas"],
  },
  "SR-5": {
    title:"Acquisition Strategies, Tools, and Methods",
    body:`[ORG] employs acquisition strategies and tools to reduce exposure to supply chain risks for [SYSTEM] components. Strategies include: use of DISA APL-listed products, preference for US-manufactured components, avoidance of counterfeit components, and use of trusted suppliers. [TOOL:crowdstrike], [TOOL:hbss], [TOOL:acas], [TOOL:tenablesc], [TOOL:paloalto], and [TOOL:ivanti] are procured through authorized channels with verified supply chains. Acquisition decisions consider supply chain risk ratings.`,
    tools:["crowdstrike","hbss","acas","tenablesc","paloalto","ivanti"],
  },
  "SR-6": {
    title:"Supplier Assessments and Reviews",
    body:`[ORG] assesses and reviews the supply chain-related risks associated with suppliers and services for [SYSTEM]. Supplier assessments review: financial stability, security posture (SOC 2, FedRAMP, DISA APL), incident history, and country of origin of components. Critical suppliers ([TOOL:crowdstrike], [TOOL:paloalto], [TOOL:ivanti]) are assessed annually. Assessment results inform procurement decisions and contract requirements. The [ISSM] maintains supplier risk ratings and reports to the [AO] annually.`,
    tools:["crowdstrike","paloalto","ivanti"],
  },
  "SR-8": {
    title:"Notification Agreements",
    body:`[ORG] establishes notification agreements with suppliers of [SYSTEM] components regarding: security vulnerabilities, data breaches, supply chain incidents, and product changes. Notification requirements are included in contracts for critical suppliers. Suppliers are required to notify [ORG] within 24 hours of confirmed security incidents. [TOOL:crowdstrike], [TOOL:paloalto], [TOOL:ivanti], and [TOOL:acas]/[TOOL:tenablesc] vendor notification agreements are current. The [ISSO] receives and acts on supplier notifications.`,
    tools:["crowdstrike","paloalto","ivanti","acas","tenablesc"],
  },
  "SR-9": {
    title:"Tamper Resistance and Detection",
    body:`[ORG] implements tamper protection for [SYSTEM] components. Hardware components use tamper-evident seals on critical equipment. [TOOL:crowdstrike] detects unauthorized modifications to system binaries and firmware. [TOOL:hbss] provides file integrity monitoring. Secure Boot on [TOOL:win11] and server systems prevents unauthorized firmware modification. Physical inspection of hardware for tampering is conducted during quarterly physical security inspections. Tamper detection events are reported to the [ISSO] immediately.`,
    tools:["crowdstrike","hbss","win11"],
  },
  "SR-10": {
    title:"Inspection of Systems or Components",
    body:`[ORG] inspects [SYSTEM] components at receipt to detect tampering and verify authenticity. Receiving inspection procedures include: physical inspection for tamper evidence, serial number verification against purchase orders, and [TOOL:acas] vulnerability scanning before deployment. Critical components are compared against vendor specifications. Inspection records are maintained for 3 years. Suspicious components are quarantined and reported to the [ISSM] and supply chain risk management team.`,
    tools:["acas"],
  },
  "SR-11": {
    title:"Component Authenticity",
    body:`[ORG] employs measures to detect and prevent counterfeit components in [SYSTEM]. Procurement is through authorized channels only. Components are sourced from original equipment manufacturers or authorized distributors. Hardware authenticity is verified via serial number verification with vendors. Software authenticity is verified via digital signatures before installation. [TOOL:acas] scans detect software with integrity violations. Suspected counterfeit components are reported to the [ISSM], contracting officer, and DoD supply chain risk management authority.`,
    tools:["acas"],
  },
  "SR-12": {
    title:"Component Disposal",
    body:`[ORG] disposes of [SYSTEM] components using policies and procedures that protect against exposure of sensitive information. Hardware containing CUI is sanitized per NIST SP 800-88 before disposal (MP-6). Storage media is degaussed or physically destroyed. Equipment disposal is documented with sanitization certificates. [TOOL:hbss] is uninstalled and licenses are released before disposal. Disposal records are maintained for 3 years. The [ISSO] approves all [SYSTEM] component disposals.`,
    tools:["hbss"],
  },
};

// ── Control family metadata ─────────────────────────────────────────────────
export const ALL_FAMILIES = [
  { id:"AC", name:"Access Control",                  controls:["AC-1","AC-2","AC-3","AC-4","AC-5","AC-6","AC-7","AC-8","AC-10","AC-11","AC-12","AC-14","AC-17","AC-18","AC-19","AC-20","AC-21","AC-22"] },
  { id:"AT", name:"Awareness and Training",           controls:["AT-1","AT-2","AT-3","AT-4"] },
  { id:"AU", name:"Audit and Accountability",         controls:["AU-1","AU-2","AU-3","AU-4","AU-5","AU-6","AU-7","AU-8","AU-9","AU-10","AU-11","AU-12"] },
  { id:"CA", name:"Assessment, Auth, Monitoring",     controls:["CA-1","CA-2","CA-3","CA-5","CA-6","CA-7","CA-8","CA-9"] },
  { id:"CM", name:"Configuration Management",         controls:["CM-1","CM-2","CM-3","CM-4","CM-5","CM-6","CM-7","CM-8","CM-9","CM-10","CM-11"] },
  { id:"CP", name:"Contingency Planning",             controls:["CP-1","CP-2","CP-3","CP-4","CP-6","CP-7","CP-8","CP-9","CP-10"] },
  { id:"IA", name:"Identification and Auth",          controls:["IA-1","IA-2","IA-3","IA-4","IA-5","IA-6","IA-7","IA-8","IA-11","IA-12"] },
  { id:"IR", name:"Incident Response",                controls:["IR-1","IR-2","IR-3","IR-4","IR-5","IR-6","IR-7","IR-8","IR-10"] },
  { id:"MA", name:"Maintenance",                      controls:["MA-1","MA-2","MA-3","MA-4","MA-5","MA-6"] },
  { id:"MP", name:"Media Protection",                 controls:["MP-1","MP-2","MP-3","MP-4","MP-5","MP-6","MP-7"] },
  { id:"PE", name:"Physical and Environmental",       controls:["PE-1","PE-2","PE-3","PE-4","PE-5","PE-6","PE-8","PE-9","PE-10","PE-11","PE-12","PE-13","PE-14","PE-15","PE-16","PE-17"] },
  { id:"PL", name:"Planning",                         controls:["PL-1","PL-2","PL-4","PL-8","PL-10","PL-11"] },
  { id:"PM", name:"Program Management",               controls:["PM-1","PM-2","PM-3","PM-4","PM-5","PM-6","PM-9","PM-10","PM-11","PM-14","PM-16"] },
  { id:"PS", name:"Personnel Security",               controls:["PS-1","PS-2","PS-3","PS-4","PS-5","PS-6","PS-7","PS-8"] },
  { id:"RA", name:"Risk Assessment",                  controls:["RA-1","RA-2","RA-3","RA-5","RA-7","RA-9"] },
  { id:"SA", name:"System and Services Acquisition",  controls:["SA-1","SA-2","SA-3","SA-4","SA-5","SA-8","SA-9","SA-10","SA-11","SA-15","SA-16","SA-17"] },
  { id:"SC", name:"System and Comms Protection",      controls:["SC-1","SC-2","SC-3","SC-4","SC-5","SC-7","SC-8","SC-10","SC-12","SC-13","SC-15","SC-17","SC-18","SC-19","SC-20","SC-21","SC-22","SC-23","SC-28","SC-39"] },
  { id:"SI", name:"System and Info Integrity",        controls:["SI-1","SI-2","SI-3","SI-4","SI-5","SI-6","SI-7","SI-8","SI-10","SI-12","SI-16"] },
  { id:"SR", name:"Supply Chain Risk Mgmt",           controls:["SR-1","SR-2","SR-3","SR-5","SR-6","SR-8","SR-9","SR-10","SR-11","SR-12"] },
];
