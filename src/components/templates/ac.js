// AC — Access Control
// NIST SP 800-53 Rev 5 — Base controls + all enhancements
// DoD-aligned statements for F-35/DIB environment

export default {

  "AC-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated an Access Control Policy addressing purpose, scope, roles, responsibilities, management commitment, and compliance. The policy is consistent with DoDI 8500.01, NIST SP 800-53 Rev 5, and applicable DISA STIGs. It is reviewed and updated annually or when significant changes occur. The [ISSO] is responsible for maintaining the policy current. Procedures to implement the access control policy are documented and maintained in [ORG]'s SOP library.`,
    tools:[],
  },
  "AC-2": {
    title:"Account Management",
    body:`Account management for [SYSTEM] is implemented through [TOOL:ad] and enforced via [TOOL:gpo]. All account types (user, privileged, service, guest, temporary, emergency) are established, activated, modified, reviewed, disabled, and removed per [ORG] procedures. Account creation requires documented supervisor approval via [ORG]'s ticketing system. Accounts are reviewed quarterly by the [ISSO]. Inactive accounts are disabled after 30 days. Privileged accounts use separate credentials from standard user accounts. Account management events are logged to [TOOL:splunk] with automated alerting.`,
    tools:["ad","gpo","splunk","stig","scap"],
  },
  "AC-2(1)": {
    title:"Account Management | Automated System Account Management",
    body:`[SYSTEM] employs [TOOL:ad] and automated mechanisms to support account management. [TOOL:ad] enforces account lifecycle policies including automated disabling of accounts after 35 days of inactivity, automated expiration of temporary accounts, and automated notifications to [ISSO] when accounts are created, modified, or disabled. Account management reports are generated automatically from [TOOL:ad] and reviewed by the [ISSO] weekly. [TOOL:splunk] provides real-time alerting on account management events.`,
    tools:["ad","splunk"],
  },
  "AC-2(2)": {
    title:"Account Management | Automated Temporary and Emergency Account Management",
    body:`[SYSTEM] automatically disables temporary and emergency accounts after a defined period. Temporary accounts are configured with automatic expiration dates not to exceed 30 days in [TOOL:ad]. Emergency accounts are created with 24-hour automatic expiration. The [ISSO] is notified via [TOOL:splunk] alert when temporary or emergency accounts are created. Account expiration is logged and reviewed monthly.`,
    tools:["ad","splunk"],
  },
  "AC-2(3)": {
    title:"Account Management | Disable Accounts",
    body:`[SYSTEM] automatically disables accounts after 35 days of inactivity via [TOOL:ad] automated account management policies enforced through [TOOL:gpo]. [TOOL:ad] generates weekly inactive account reports reviewed by the [ISSO]. Disabled accounts are not deleted until reviewed and approved for removal. Automated disabling events are logged to [TOOL:splunk]. The [ISSO] reviews and confirms disabled accounts monthly.`,
    tools:["ad","gpo","splunk"],
  },
  "AC-2(4)": {
    title:"Account Management | Automated Audit Actions",
    body:`[SYSTEM] automatically audits account creation, modification, enabling, disabling, and removal actions. [TOOL:ad] and [TOOL:gpo] generate audit events for all account management actions forwarded to [TOOL:splunk]. [TOOL:splunk] correlation rules generate alerts for unauthorized account changes within 15 minutes. Account management audit logs are reviewed weekly by the [ISSO] and retained per AU-11 requirements.`,
    tools:["ad","gpo","splunk"],
  },
  "AC-2(5)": {
    title:"Account Management | Inactivity Logout",
    body:`[SYSTEM] requires logout or session termination after 15 minutes of inactivity enforced via [TOOL:gpo] device lock and screen saver policies on all Windows systems. [TOOL:ivanti] VPN sessions are terminated after the inactivity timeout. Inactivity logout settings are validated via [TOOL:scap] and [TOOL:stig] quarterly.`,
    tools:["gpo","ivanti","scap","stig"],
  },
  "AC-2(6)": {
    title:"Account Management | Dynamic Privilege Management",
    body:`[SYSTEM] implements dynamic privilege management through [TOOL:ad] RBAC, where privileges are adjusted based on role changes, project assignments, and need-to-know determinations. The [ISSO] reviews privilege assignments quarterly and adjusts per least privilege principles. [TOOL:crowdstrike] monitors for privilege escalation attempts outside of authorized dynamic assignments.`,
    tools:["ad","crowdstrike"],
  },
  "AC-2(7)": {
    title:"Account Management | Privileged User Accounts",
    body:`[SYSTEM] establishes and administers privileged user accounts in accordance with a role-based access scheme. Privileged accounts ([TOOL:ad] Domain Admins, Enterprise Admins, local admins) are documented with the specific roles and responsibilities of each account. Privileged account holders are trained on secure use of privileged access. Privileged account activity is monitored via [TOOL:splunk] and [TOOL:crowdstrike] with enhanced alerting. Privileged accounts are reviewed monthly by the [ISSO].`,
    tools:["ad","splunk","crowdstrike"],
  },
  "AC-2(9)": {
    title:"Account Management | Restrictions on Use of Shared and Group Accounts",
    body:`[SYSTEM] only permits use of shared/group accounts where [ORG] has established specific conditions for their use, documented and approved by the [ISSO] and [ISSM]. Shared accounts are limited to specific operational requirements (e.g., service accounts). All shared accounts are monitored via [TOOL:splunk]. Use of shared accounts is audited quarterly. Individual accountability is maintained for all shared account usage through compensating controls.`,
    tools:["splunk"],
  },
  "AC-2(10)": {
    title:"Account Management | Shared and Group Account Credential Change",
    body:`[SYSTEM] changes credentials for shared and group accounts when membership changes. [TOOL:ad] service account passwords are rotated via automated policy when personnel with knowledge of the credentials depart or are reassigned. [TOOL:gpo] enforces service account password policies. The [ISSO] maintains a list of all shared accounts and their authorized users, reviewed quarterly.`,
    tools:["ad","gpo"],
  },
  "AC-2(11)": {
    title:"Account Management | Usage Conditions",
    body:`[SYSTEM] enforces usage conditions for accounts including: time-of-day restrictions for privileged accounts, network location restrictions via [TOOL:paloalto] firewall policies, and device health requirements enforced by [TOOL:crowdstrike]. Usage condition violations generate [TOOL:splunk] alerts reviewed by the [ISSO] within 4 hours. Usage conditions are documented in the account management procedures.`,
    tools:["paloalto","crowdstrike","splunk"],
  },
  "AC-2(12)": {
    title:"Account Management | Account Monitoring for Atypical Usage",
    body:`[SYSTEM] monitors for atypical usage patterns including: after-hours access, access from unusual locations, excessive failed authentication attempts, and access to unusual resources. [TOOL:splunk] provides behavioral analytics with automated alerting for anomalous account activity. [TOOL:crowdstrike] monitors endpoint behavior for atypical usage patterns. [TOOL:paloalto] logs are analyzed for unusual network access patterns. Atypical usage alerts are reviewed by the [ISSO] within 4 hours and reported to the [ISSM] if indicative of insider threat or compromise.`,
    tools:["splunk","crowdstrike","paloalto"],
  },
  "AC-2(13)": {
    title:"Account Management | Disable Accounts for High-Risk Individuals",
    body:`[SYSTEM] disables accounts of individuals posing significant risk within one hour of notification. The [ISSO] has the authority and procedure to immediately disable [TOOL:ad] accounts, revoke [TOOL:cac] certificates (via DoD PKI revocation), and terminate [TOOL:ivanti] VPN sessions for high-risk individuals. The Personnel Security Officer notifies the [ISSO] immediately upon determination of high-risk status. Account disabling is logged to [TOOL:splunk] and reported to the [ISSM].`,
    tools:["ad","cac","ivanti","splunk"],
  },
  "AC-3": {
    title:"Access Enforcement",
    body:`Access enforcement for [SYSTEM] uses RBAC in [TOOL:ad]. NTFS permissions enforce least privilege at the file system level. [TOOL:gpo] enforces access control settings across all Windows systems. Network access is controlled by [TOOL:paloalto] enforcing deny-all/permit-by-exception. Remote access is controlled via [TOOL:ivanti]. Access enforcement is validated via [TOOL:scap] quarterly.`,
    tools:["ad","gpo","paloalto","ivanti","scap","stig"],
  },
  "AC-3(7)": {
    title:"Access Enforcement | Role-Based Access Control",
    body:`[SYSTEM] enforces role-based access control (RBAC) policies over all subjects and objects where the organization defines roles, assigns users to roles, and assigns access rights to roles. [TOOL:ad] security groups define all [SYSTEM] roles. Role assignments are reviewed quarterly by the [ISSO]. Users are added to groups only with documented supervisor approval. Role-based access is validated via [TOOL:stig] compliance checks. [TOOL:splunk] monitors for role assignment changes outside the approved process.`,
    tools:["ad","splunk","stig"],
  },
  "AC-3(10)": {
    title:"Access Enforcement | Audited Override of Access Control Mechanisms",
    body:`[SYSTEM] employs an audited override of automated access control mechanisms under specified conditions. Any override of access control mechanisms requires [ISSM] approval, is time-limited, and is fully audited in [TOOL:splunk]. Override events generate immediate alerts to the [ISSO] and [ISSM]. Override procedures are documented and reviewed annually.`,
    tools:["splunk"],
  },

  "AC-3(2)": {
    title:"Access Enforcement | Dual Authorization",
    body:`[SYSTEM] enforces dual authorization for [ORG]-defined privileged commands and actions. Dual authorization (also called two-person integrity) requires approval from two authorized individuals before execution of defined privileged actions. Dual authorization applies to: production database modifications, security configuration changes, and privileged account creation. The [ISSO] defines which actions require dual authorization. [TOOL:splunk] logs all dual authorization events. Dual authorization requirements are documented in [ORG]'s security procedures and validated during annual assessments.`,
    tools:["splunk"],
  },
  "AC-3(3)": {
    title:"Access Enforcement | Mandatory Access Control",
    body:`[SYSTEM] enforces mandatory access control (MAC) policies for all subjects and objects where the policy specifies that: subjects that have been granted access to information cannot pass the information to unauthorized subjects; subjects cannot change the access control attributes of defined objects; and user subjects are constrained from passing information to unauthorized higher security levels. MAC is implemented through [TOOL:ad] domain security policies and object-level access controls. [TOOL:gpo] enforces MAC policies on all Windows systems. MAC policy compliance is validated during annual security assessments.`,
    tools:["ad","gpo"],
  },
  "AC-3(4)": {
    title:"Access Enforcement | Discretionary Access Control",
    body:`[SYSTEM] enforces discretionary access control (DAC) policies for defined subjects and objects. DAC is implemented through [TOOL:ad] RBAC and NTFS permissions allowing object owners to specify access permissions for their objects. DAC policy compliance ensures that only authorized users can access or modify objects. [TOOL:gpo] enforces DAC policies. The [ISSO] reviews DAC policy compliance quarterly via [TOOL:scap] and [TOOL:stig] checks.`,
    tools:["ad","gpo","scap","stig"],
  },
  "AC-3(5)": {
    title:"Access Enforcement | Security-Relevant Information",
    body:`[SYSTEM] prevents access to security-relevant information except during secure, non-operable system states. Security-relevant information (audit logs, security configurations, cryptographic keys) is accessible only to authorized security personnel. [TOOL:ad] RBAC restricts access to security-relevant information to the [ISSO], [ISSM], and designated security personnel. [TOOL:splunk] protects audit data from unauthorized access. Security-relevant information access is reviewed quarterly.`,
    tools:["ad","splunk"],
  },
  "AC-3(8)": {
    title:"Access Enforcement | Revocation of Access Authorizations",
    body:`[SYSTEM] enforces the revocation of access authorizations resulting from changes to personnel or the security attributes of subjects and objects. [TOOL:ad] account management processes ensure immediate revocation of access when personnel are terminated, transferred, or when security attributes change. [TOOL:cac] revocation through DoD PKI ensures authentication credentials are invalidated. The [ISSO] has procedures to revoke all access within 24 hours of notification. [TOOL:ivanti] VPN access is immediately terminated upon revocation.`,
    tools:["ad","cac","ivanti"],
  },
  "AC-3(9)": {
    title:"Access Enforcement | Controlled Release",
    body:`[SYSTEM] does not release information outside of established system boundaries unless the [ISSO] verifies that the receiving system employs adequate security safeguards. Information releases outside [SYSTEM] boundaries require [ISSO] approval and documentation. [TOOL:paloalto] enforces technical controls on information flows to external systems. Controlled release procedures are documented and reviewed annually. Unauthorized information releases are investigated as potential incidents.`,
    tools:["paloalto"],
  },
  "AC-3(11)": {
    title:"Access Enforcement | Restrict Access to Specific Information Types",
    body:`[SYSTEM] restricts access to information types based on special security requirements. Access to sensitive information types (CUI, Privacy Act data, privileged account data) is restricted to personnel with documented need-to-know in addition to security clearance requirements. [TOOL:ad] security groups enforce information type-based access restrictions. [TOOL:splunk] monitors access to restricted information types. Information type access restrictions are reviewed quarterly by the [ISSO].`,
    tools:["ad","splunk"],
  },
  "AC-3(12)": {
    title:"Access Enforcement | Assert and Enforce Application Access",
    body:`[SYSTEM] requires applications to assert, as part of the installation process, the access needed to the following system resources: [ORG]-defined system resources. Applications deployed on [SYSTEM] must declare required permissions before installation. The [ISSO] reviews application permission requests as part of the software approval process. Excessive permission requests are denied or mitigated. [TOOL:crowdstrike] monitors application access to system resources at runtime.`,
    tools:["crowdstrike"],
  },
  "AC-3(13)": {
    title:"Access Enforcement | Attribute-Based Access Control",
    body:`[SYSTEM] enforces attribute-based access control (ABAC) policies using attributes associated with subjects, objects, environments, and operations. [TOOL:ad] attribute-based policies extend RBAC with additional access conditions. Access decisions for sensitive operations consider: user attributes (clearance, role, training status), object attributes (classification, sensitivity), and environment attributes (time, location, device health). [TOOL:crowdstrike] device health assessment provides environmental attributes for access decisions.`,
    tools:["ad","crowdstrike"],
  },
  "AC-3(14)": {
    title:"Access Enforcement | Individual Access",
    body:`[SYSTEM] provides mechanisms to enable individuals to have access to the following elements of their personally identifiable information: [ORG]-defined elements. [SYSTEM] enables individuals to access their own PII maintained in [SYSTEM] where applicable under the Privacy Act. Access to personal information is provided through secure, authenticated channels using [TOOL:cac]. Requests for individual access to PII are processed within [ORG]'s defined timeframe per the Privacy Act. The privacy official coordinates individual access request procedures.`,
    tools:["cac"],
  },
  "AC-4": {
    title:"Information Flow Enforcement",
    body:`[SYSTEM] enforces approved authorizations for controlling information flows. [TOOL:paloalto] enforces information flow policies at the perimeter using application-aware rules preventing unauthorized flows between security domains. [TOOL:zscaler] enforces outbound web traffic policies. [TOOL:splunk] monitors for policy violations. Information flow control policies are reviewed annually and validated via [TOOL:stig].`,
    tools:["paloalto","zscaler","splunk","stig"],
  },
  "AC-4(8)": {
    title:"Information Flow Enforcement | Security and Privacy Policy Filters",
    body:`[SYSTEM] enforces information flow control policies using filters that implement security and privacy policy criteria. [TOOL:paloalto] implements application-layer inspection policies filtering content based on data classification and handling requirements. [TOOL:zscaler] enforces DLP policies preventing exfiltration of CUI. Filter configurations are reviewed and updated quarterly by the [ISSO].`,
    tools:["paloalto","zscaler"],
  },
  "AC-4(21)": {
    title:"Information Flow Enforcement | Physical or Logical Separation of Information Flows",
    body:`[SYSTEM] separates information flows logically or physically using [TOOL:cisco9300] VLAN segmentation and [TOOL:paloalto] security zones. Different classification levels and data types are separated into distinct network segments. [TOOL:paloalto] enforces inter-zone policies preventing unauthorized flows between segments. Network segmentation is validated via [TOOL:stig] checks and documented in the network architecture diagram.`,
    tools:["cisco9300","paloalto","stig"],
  },
  "AC-5": {
    title:"Separation of Duties",
    body:`[SYSTEM] enforces separation of duties through [TOOL:ad] RBAC. No single individual has all capabilities to perform a critical function without oversight. System administrators are separate from security personnel. Audit log management is separate from system administration. [TOOL:splunk] detects violations of separation of duties. Assignments are reviewed quarterly.`,
    tools:["ad","splunk"],
  },
  "AC-6": {
    title:"Least Privilege",
    body:`[SYSTEM] employs least privilege via [TOOL:ad] RBAC. Users are granted minimum permissions for assigned duties. Privileged accounts are separate from standard accounts and used only for administrative tasks. [TOOL:crowdstrike] monitors for privilege escalation. [TOOL:gpo] enforces UAC on all Windows systems. Privileged account usage is reviewed monthly via [TOOL:splunk].`,
    tools:["ad","crowdstrike","gpo","splunk","scap","stig"],
  },
  "AC-6(1)": {
    title:"Least Privilege | Authorize Access to Security Functions",
    body:`[SYSTEM] explicitly authorizes access to security functions and security-relevant information. Access to [TOOL:splunk] security dashboards, [TOOL:crowdstrike] console, [TOOL:acas]/[TOOL:tenablesc] management, [TOOL:paloalto] management, and [TOOL:hbss] ePO console is restricted to the [ISSO], [ISSM], and designated security personnel via [TOOL:ad] security groups. Access to security functions is reviewed quarterly and logged.`,
    tools:["splunk","crowdstrike","acas","tenablesc","paloalto","hbss","ad"],
  },
  "AC-6(2)": {
    title:"Least Privilege | Non-Privileged Access for Non-Security Functions",
    body:`[SYSTEM] requires that users with privileged accounts use non-privileged accounts or roles for routine activities (email, web browsing, document creation). Privileged users maintain separate standard user accounts for non-privileged work. [TOOL:gpo] enforces UAC preventing privileged account usage for standard tasks. [TOOL:crowdstrike] monitors for privileged account usage in non-privileged contexts. Compliance is validated via [TOOL:stig] quarterly.`,
    tools:["gpo","crowdstrike","stig"],
  },
  "AC-6(5)": {
    title:"Least Privilege | Privileged Accounts",
    body:`[SYSTEM] restricts privileged accounts to [ISSO]-approved personnel only. Privileged account roster is maintained in [TOOL:ad] and reviewed monthly by the [ISSO]. Personnel with privileged access must have appropriate background investigation. Privileged accounts are named per [ORG] naming convention distinguishing them from standard accounts. [TOOL:splunk] provides enhanced monitoring of all privileged account activity.`,
    tools:["ad","splunk"],
  },
  "AC-6(9)": {
    title:"Least Privilege | Log Use of Privileged Functions",
    body:`[SYSTEM] logs the execution of privileged functions. [TOOL:gpo] enables Windows Security Audit Policy to log all privileged function use including: process creation, privilege use, and policy changes. [TOOL:crowdstrike] logs privileged process execution with full context. [TOOL:splunk] aggregates and alerts on privileged function usage outside normal patterns. Privileged function logs are reviewed weekly by the [ISSO].`,
    tools:["gpo","crowdstrike","splunk"],
  },
  "AC-6(10)": {
    title:"Least Privilege | Prohibit Non-Privileged Users from Executing Privileged Functions",
    body:`[SYSTEM] prohibits non-privileged users from executing privileged functions. [TOOL:gpo] enforces UAC and software restriction policies preventing standard users from executing privileged functions. [TOOL:hbss] HIPS blocks unauthorized privilege escalation attempts. [TOOL:crowdstrike] detects and prevents exploitation of privilege escalation vulnerabilities. Violations are logged to [TOOL:splunk] and investigated by the [ISSO] within 4 hours.`,
    tools:["gpo","hbss","crowdstrike","splunk"],
  },
  "AC-7": {
    title:"Unsuccessful Logon Attempts",
    body:`[SYSTEM] enforces account lockout after 5 consecutive failed attempts with 15-minute lockout via [TOOL:gpo]. [TOOL:cac] locks after 3 incorrect PINs. Failed logon events are logged to [TOOL:splunk] with brute force alerting. Validated via [TOOL:scap] and [TOOL:stig].`,
    tools:["gpo","cac","splunk","scap","stig"],
  },
  "AC-7(2)": {
    title:"Unsuccessful Logon Attempts | Purge or Wipe Mobile Device",
    body:`[SYSTEM] purges or wipes mobile devices after a defined number of consecutive unsuccessful authentication attempts. Mobile devices authorized to access [SYSTEM] resources are enrolled in [ORG]'s MDM solution configured to wipe after 10 consecutive failed PIN attempts. The [ISSO] is notified of device wipe events via [TOOL:splunk] alerting. Mobile device wipe procedures are tested annually.`,
    tools:["splunk"],
  },
  "AC-8": {
    title:"System Use Notification",
    body:`[SYSTEM] displays the DoD-approved warning banner before granting access. The banner states the system is for authorized use only and subject to monitoring. Enforced via [TOOL:gpo] on Windows and login banners on network devices ([TOOL:juniper], [TOOL:cisco9300]). [TOOL:ivanti] displays banner before VPN auth. Validated via [TOOL:scap] and [TOOL:stig] (V-220708).`,
    tools:["gpo","juniper","cisco9300","ivanti","scap","stig"],
  },
  "AC-10": {
    title:"Concurrent Session Control",
    body:`[SYSTEM] limits concurrent sessions per user via [TOOL:gpo] and [TOOL:ad] policies. Privileged accounts are limited to one concurrent session. [TOOL:ivanti] enforces VPN session limits. Session limits meet DISA STIG requirements validated via [TOOL:scap].`,
    tools:["gpo","ad","ivanti","scap","stig"],
  },
  "AC-11": {
    title:"Device Lock",
    body:`[SYSTEM] enforces device lock after 15 minutes of inactivity via [TOOL:gpo]. [TOOL:cac] re-authentication required to unlock. Validated via [TOOL:scap] and [TOOL:stig].`,
    tools:["gpo","cac","scap","stig"],
  },
  "AC-11(1)": {
    title:"Device Lock | Pattern-Hiding Displays",
    body:`[SYSTEM] conceals information previously visible on displays when device lock is activated. Windows screen savers are configured to display a blank screen or non-sensitive image when activated via [TOOL:gpo]. Screen saver settings are validated via [TOOL:stig] and [TOOL:scap] checks to ensure content concealment is enforced on all [TOOL:win11] workstations and servers.`,
    tools:["gpo","win11","stig","scap"],
  },
  "AC-12": {
    title:"Session Termination",
    body:`[SYSTEM] terminates sessions after inactivity (15 min), duration limits, and logoff. [TOOL:ivanti] VPN sessions terminate after inactivity. [TOOL:gpo] enforces termination policies on Windows. Logged to [TOOL:splunk]. Validated via [TOOL:stig].`,
    tools:["ivanti","gpo","splunk","stig"],
  },
  "AC-12(1)": {
    title:"Session Termination | User-Initiated Logouts and Message Displays",
    body:`[SYSTEM] provides a logout capability for user-initiated communication session termination. Windows systems provide accessible logoff capability on all [TOOL:win11] workstations. [TOOL:ivanti] VPN client provides user-initiated disconnect. Upon session termination, the system displays an explicit logout confirmation message. Session termination procedures are included in user awareness training.`,
    tools:["win11","ivanti"],
  },
  "AC-14": {
    title:"Permitted Actions Without Identification or Authentication",
    body:`[SYSTEM] permits only viewing of publicly available information without authentication. [TOOL:paloalto] enforces this at the network boundary. Permitted unauthenticated actions are reviewed and approved by the [ISSO] and [ISSM] annually.`,
    tools:["paloalto"],
  },
  "AC-17": {
    title:"Remote Access",
    body:`Remote access uses [TOOL:ivanti] VPN with [TOOL:cac] authentication. All sessions use TLS 1.2+. [TOOL:zscaler] provides additional security. Logged to [TOOL:splunk]. [TOOL:paloalto] enforces network-level controls. Validated via [TOOL:stig].`,
    tools:["ivanti","cac","zscaler","splunk","paloalto","stig"],
  },
  "AC-17(1)": {
    title:"Remote Access | Monitoring and Control",
    body:`[SYSTEM] employs automated mechanisms to monitor and control remote access sessions. [TOOL:ivanti] provides real-time session monitoring including user identity, connection time, duration, and data transferred. [TOOL:splunk] aggregates VPN session logs and generates alerts for anomalous remote access patterns. [TOOL:paloalto] monitors remote access traffic for threats and policy violations. The [ISSO] reviews remote access reports weekly.`,
    tools:["ivanti","splunk","paloalto"],
  },
  "AC-17(2)": {
    title:"Remote Access | Protection of Confidentiality and Integrity Using Encryption",
    body:`[SYSTEM] implements cryptographic mechanisms to protect confidentiality and integrity of remote access sessions. [TOOL:ivanti] VPN uses AES-256-GCM encryption with SHA-384 integrity protection. TLS 1.2 or higher is enforced for all remote sessions. FIPS 140-2 validated cryptographic modules are used. [TOOL:paloalto] enforces encryption policy for all remote connections. Encryption compliance is validated via [TOOL:stig] and [TOOL:scap].`,
    tools:["ivanti","paloalto","scap","stig"],
  },
  "AC-17(3)": {
    title:"Remote Access | Managed Access Control Points",
    body:`[SYSTEM] routes all remote access through a limited number of managed network access control points. All remote access enters [SYSTEM] exclusively through [TOOL:ivanti] VPN gateways, which are monitored and protected by [TOOL:paloalto]. There are no split-tunnel configurations allowing remote users to bypass inspection. [TOOL:zscaler] routes web traffic through managed inspection points. The number and location of remote access points is documented in the network architecture.`,
    tools:["ivanti","paloalto","zscaler"],
  },
  "AC-17(4)": {
    title:"Remote Access | Privileged Commands and Access",
    body:`[SYSTEM] authorizes the execution of privileged commands and access to security-relevant information via remote access only for documented operational needs. Privileged remote access requires [ISSO] authorization on a case-by-case basis. All privileged remote access sessions are monitored in real time via [TOOL:splunk] and [TOOL:crowdstrike]. Privileged remote sessions are terminated when the authorized task is complete.`,
    tools:["splunk","crowdstrike"],
  },
  "AC-17(9)": {
    title:"Remote Access | Disconnect or Disable Access",
    body:`[SYSTEM] provides the capability to disconnect or disable remote access within 15 minutes. The [ISSO] and [ISSM] have authority to immediately terminate any or all remote access sessions via [TOOL:ivanti] management console. Emergency remote access termination procedures are documented and tested annually. [TOOL:paloalto] ACL changes can block all remote access within minutes if required.`,
    tools:["ivanti","paloalto"],
  },
  "AC-18": {
    title:"Wireless Access",
    body:`Wireless access to [SYSTEM] is prohibited unless specifically authorized. Where authorized: WPA3 encryption, [TOOL:cac] authentication, segregated network. [TOOL:paloalto] enforces wireless policies. Unauthorized wireless devices are detected and reported.`,
    tools:["cac","paloalto","stig"],
  },
  "AC-18(1)": {
    title:"Wireless Access | Authentication and Encryption",
    body:`[SYSTEM] protects wireless access using authentication and encryption. Authorized wireless access uses WPA3-Enterprise with 802.1X authentication tied to [TOOL:ad] and [TOOL:cac] certificate-based authentication. AES-256 encryption is required for all wireless communications. Wireless access points are configured per DISA STIG requirements validated by [TOOL:stig] checklists. Encryption and authentication settings are audited quarterly.`,
    tools:["ad","cac","stig"],
  },
  "AC-19": {
    title:"Access Control for Mobile Devices",
    body:`Mobile device access requires MDM enrollment, meets [ORG] security requirements, uses [TOOL:ivanti] VPN and [TOOL:cac] authentication. Compliance monitored by the [ISSO] quarterly. BYOD prohibited for CUI without [ISSM] and [AO] approval.`,
    tools:["ivanti","cac"],
  },
  "AC-19(5)": {
    title:"Access Control for Mobile Devices | Full Device or Container-Based Encryption",
    body:`[SYSTEM] employs full device or container-based encryption to protect CUI on mobile devices. All authorized mobile devices accessing [SYSTEM] must have full-device encryption enabled. Encryption uses AES-256 or equivalent FIPS 140-2 compliant algorithms. Encryption compliance is verified by the [ISSO] via MDM enrollment reports. Devices failing encryption compliance checks are immediately removed from access.`,
    tools:[],
  },
  "AC-20": {
    title:"Use of External Systems",
    body:`Terms and conditions govern external system access to [SYSTEM]. BYOD prohibited without [ISSO] approval. [TOOL:ivanti] VPN with [TOOL:cac] required for all external access. [TOOL:zscaler] enforces web policies. External connections reviewed annually.`,
    tools:["ivanti","cac","zscaler"],
  },
  "AC-20(1)": {
    title:"Use of External Systems | Limits on Authorized Use",
    body:`[SYSTEM] permits authorized individuals to use external systems to access [SYSTEM] only when verified the external system employs security controls equivalent to [ORG] requirements. The [ISSO] verifies external system compliance before authorizing access. External systems must use [TOOL:ivanti] VPN with [TOOL:cac] authentication. [TOOL:crowdstrike] or equivalent must be installed on the external system. External system verification is documented and reviewed annually.`,
    tools:["ivanti","cac","crowdstrike"],
  },
  "AC-20(2)": {
    title:"Use of External Systems | Portable Storage Devices — Restricted Use",
    body:`[SYSTEM] restricts use of portable storage devices on external systems. Personnel are prohibited from using personally-owned portable storage devices with [SYSTEM] data. [TOOL:gpo] enforces USB storage restrictions on [SYSTEM] endpoints. [TOOL:hbss] controls removable media access. When portable storage is authorized on external systems, the device must be [ORG]-owned, encrypted, and scanned before use.`,
    tools:["gpo","hbss"],
  },
  "AC-21": {
    title:"Information Sharing",
    body:`Information sharing with external entities requires [ISSO] and [ISSM] approval. [TOOL:paloalto] enforces technical controls on external information flows. All sharing arrangements are documented and reviewed annually. CUI sharing complies with CUI Registry requirements.`,
    tools:["paloalto"],
  },
  "AC-22": {
    title:"Publicly Accessible Content",
    body:`Publicly accessible content is reviewed by the [ISSO] before posting to ensure no CUI. Public-facing servers are segregated by [TOOL:paloalto] DMZ architecture. [TOOL:zscaler] provides proxy controls. Content reviewed quarterly.`,
    tools:["paloalto","zscaler"],
  },
  "AC-23": {
    title:"Data Mining Protection",
    body:`[SYSTEM] employs data mining prevention and detection techniques to protect against unauthorized data mining. [TOOL:paloalto] application-layer controls detect and block data mining patterns against [SYSTEM] databases and applications. [TOOL:splunk] correlation rules detect unusual query patterns indicative of data mining. [TOOL:crowdstrike] monitors for processes exhibiting data exfiltration behavior. Data mining protection policies are reviewed and updated annually.`,
    tools:["paloalto","splunk","crowdstrike"],
  },
  "AC-24": {
    title:"Access Control Decisions",
    body:`[SYSTEM] establishes procedures to ensure access control decisions are made by authorized officials only. [TOOL:ad] RBAC ensures access decisions are enforced by the access control system based on policies defined by the [ISSO]. Access control policy changes require [ISSO] and [ISSM] approval. [TOOL:splunk] logs all access control policy changes. Access decisions are reviewed quarterly.`,
    tools:["ad","splunk"],
  },
  "AC-25": {
    title:"Reference Monitor",
    body:`[SYSTEM] implements a reference monitor that is tamper-proof, always invoked, and small enough to be subject to analysis and testing. Windows Security Reference Monitor enforces access control on all [TOOL:win11] and server systems. [TOOL:crowdstrike] protects the Windows kernel and security functions from tampering. [TOOL:gpo] enforces Secure Boot and Code Integrity to protect the reference monitor implementation. Reference monitor integrity is validated via [TOOL:stig] and [TOOL:scap].`,
    tools:["win11","crowdstrike","gpo","stig","scap"],
  },
};
