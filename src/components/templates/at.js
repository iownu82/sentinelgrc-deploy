// AT — Awareness and Training

export default {
  "AT-1": {
    title:"Policy and Procedures",
    body:`[ORG] has developed, documented, and disseminated an Awareness and Training Policy requiring all personnel with access to [SYSTEM] to complete security awareness training. The policy is consistent with DoDI 8500.01 and DoD 8570.01-M/DoD 8140. It is reviewed annually. The [ISSM] is responsible for the security training program.`,
    tools:[],
  },
  "AT-2": {
    title:"Literacy Training and Awareness",
    body:`All [SYSTEM] users complete security awareness training within 10 days of account creation and annually thereafter. Training covers: threat recognition, CUI handling, CAC usage, password security, reporting procedures, and acceptable use. Provided via DoD ATCTS/JKO. Completion is tracked and non-compliant accounts are suspended until training is complete. Training records are maintained for 3 years.`,
    tools:["cac"],
  },
  "AT-2(2)": {
    title:"Literacy Training and Awareness | Insider Threat",
    body:`[ORG] includes insider threat awareness as part of security awareness training for [SYSTEM] personnel. Training covers: recognition of insider threat indicators, reporting procedures, and [ORG]'s insider threat program. [TOOL:splunk] and [TOOL:crowdstrike] behavioral analytics support the technical component of the insider threat program. Personnel are trained to report suspicious behavior to the [ISSO] and [ISSM]. Insider threat training is updated annually based on current threat intelligence from [TOOL:crowdstrike].`,
    tools:["splunk","crowdstrike"],
  },
  "AT-2(3)": {
    title:"Literacy Training and Awareness | Social Engineering and Mining",
    body:`[ORG] includes social engineering and social mining awareness in security training for [SYSTEM] personnel. Training covers: phishing recognition, vishing, pretexting, and social media exploitation. Personnel are trained to verify identity before providing information. [TOOL:paloalto] and [TOOL:zscaler] provide technical controls against phishing. Suspicious contacts are reported to the [ISSO]. Phishing simulation exercises are conducted annually.`,
    tools:["paloalto","zscaler"],
  },
  "AT-2(4)": {
    title:"Literacy Training and Awareness | Suspicious Communications and Anomalous System Behavior",
    body:`[ORG] trains [SYSTEM] personnel to recognize and report suspicious communications and anomalous system behavior. Training covers: unusual system behavior indicators, unsolicited software installation, unexpected network connections, and malicious email indicators. Personnel report suspicious behavior to the [ISSO] immediately. [TOOL:crowdstrike] and [TOOL:splunk] provide technical detection complementing personnel reporting. Reporting procedures are tested via annual exercises.`,
    tools:["crowdstrike","splunk"],
  },
  "AT-3": {
    title:"Role-Based Training",
    body:`Personnel with security responsibilities receive role-based training: [ISSO] (annual IAT Level II, 40 hours), [ISSM] (annual IAM Level II), System Administrators (DISA administrator training), privileged users (annual privileged access training). Certifications required per DoD 8570.01-M/DoD 8140. Records maintained in [TOOL:emass]. Compliance reported to [AO] annually.`,
    tools:["emass"],
  },
  "AT-3(1)": {
    title:"Role-Based Training | Environmental Controls",
    body:`[ORG] provides training to personnel with responsibilities for physical and environmental controls supporting [SYSTEM]. Training covers: physical access procedures, environmental monitoring, emergency shutdown, and incident reporting for physical events. Facilities personnel receive training on environmental monitoring systems. Training completion is tracked and reported to the [ISSM] annually.`,
    tools:[],
  },
  "AT-3(2)": {
    title:"Role-Based Training | Physical Security Controls",
    body:`[ORG] provides training to personnel with physical security responsibilities for [SYSTEM]. Training covers: access control system operation, visitor escort procedures, physical security incident reporting, and emergency procedures. Training is provided before assumption of physical security duties and annually thereafter. Physical security training records are maintained by the Physical Security Officer and reviewed by the [ISSO] annually.`,
    tools:[],
  },
  "AT-3(3)": {
    title:"Role-Based Training | Practical Exercises",
    body:`[ORG] includes practical exercises in security training for [SYSTEM] personnel. Exercises include: phishing simulations, tabletop incident response exercises, and contingency plan drills. [TOOL:crowdstrike] and [TOOL:splunk] are used as training tools during exercises. Exercise results identify training gaps addressed in subsequent training cycles. Practical exercise results are reported to the [ISSM] and incorporated into the continuous improvement of the training program.`,
    tools:["crowdstrike","splunk"],
  },
  "AT-3(4)": {
    title:"Role-Based Training | Suspicious Communications and Anomalous System Behavior",
    body:`[ORG] provides training to [SYSTEM] security personnel on recognizing and responding to suspicious communications and anomalous system behavior. Training includes hands-on use of [TOOL:splunk] for log analysis, [TOOL:crowdstrike] for threat hunting, and [TOOL:acas] for vulnerability analysis. Security personnel are trained on current threat indicators relevant to [SYSTEM] mission. Training is updated quarterly based on new threat intelligence.`,
    tools:["splunk","crowdstrike","acas"],
  },
  "AT-4": {
    title:"Training Records",
    body:`[ORG] maintains training records for all [SYSTEM] personnel documenting: trainee name, training type, completion date, and status. Records are maintained for 3 years. The [ISSO] reviews training compliance quarterly and reports to the [ISSM]. Non-compliant personnel are reported to supervisors within 5 business days. Training data is extracted from DoD ATCTS/JKO and archived.`,
    tools:[],
  },
  "AT-6": {
    title:"Training Feedback",
    body:`[ORG] provides feedback mechanisms for [SYSTEM] security training. Personnel can submit training feedback through [ORG]'s learning management system. The [ISSM] reviews training feedback quarterly and incorporates improvements. Training effectiveness is measured through post-training assessments and exercise performance. Annual training program review incorporates feedback, exercise lessons learned, and current threat intelligence from [TOOL:crowdstrike].`,
    tools:["crowdstrike"],
  },
};
