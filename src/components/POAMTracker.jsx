import { ThemeContext, useTheme, THEMES } from "../theme.js";
import { useState, useMemo, createContext, useContext, useEffect, useCallback, useRef } from "react";
import { loadPoamItems, savePoamItem, deletePoamItem } from "../supabase.js";
import { useAuth } from "./Auth.jsx";

const C = { bg:"#03080E", panel:"#060D16", panelAlt:"#08111C", panel2:"#08111C", border:"#0D1E2E", borderMd:"#152840", text:"#C8D8E8", textDim:"#7A9AB8", dim:"#7A9AB8", textMute:"#3A5570", mute:"#3A5570", white:"#F0F8FF", input:"#040C16", inputBorder:"#1A3A5C", rowA:"#050C14", rowB:"#040A12", scroll:"#1A3A5C", headerBg:"#02060C", teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444", orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF" };

const T = {
  dark: {
    bg:C.bg, panel:C.panel, panel2:C.panelAlt, border:C.border, borderMd:C.borderMd,
    text:"#C8D8E8", dim:"#7A9AB8", mute:"#3A5570", white:"#F0F8FF",
    input:C.input, inputBorder:C.inputBorder, rowA:C.rowA, rowB:C.rowB,
    scroll:C.inputBorder,
  },
  light: {
    bg:"#F2F6FA", panel:"#FFFFFF", panel2:"#F7FAFC", border:"#D8E4F0", borderMd:"#C0D4E8",
    text:"#1C2B3A", dim:"#4A6280", mute:"#90A8C0", white:"#FFFFFF",
    input:"#FFFFFF", inputBorder:"#B8CDE0", rowA:"#FFFFFF", rowB:"#F7FAFC",
    scroll:"#C0D4E8",
  },
};
const A = { teal:"#00C49A", blue:"#1A7AFF", red:"#E84444", orange:"#F07820", gold:"#E8B800", green:"#00B87A", purple:"#9A5AF0" };
const SEV = { H:{l:"High",c:A.red}, M:{l:"Medium",c:A.gold}, L:{l:"Low",c:A.green} };
const CAT_C = { "I":A.red, "II":A.orange, "III":A.gold };
const STATUSES = ["Ongoing","Remediated","Risk Accepted","Delayed","Closed"];
const ROLES = ["SA","NA","ISSO","ISSM","PM"];
const MS_STATUSES = ["Pending","In Progress","Complete","Blocked"];
const ROLE_LABELS = {
  SA:"System Administrator", NA:"Network Administrator",
  ISSO:"Info System Security Officer", ISSM:"Info System Security Manager", PM:"Program Manager"
};
const POAMS_INIT = [
  { id:"POAM-001", control:"SC-7", cat:"I", severity:"H", weakness:"Unrestricted security group allows all inbound traffic from 0.0.0.0/0", source:"ACAS / Nessus", cve:"", poc:"SA", action_owners:["SA","ISSO"], cost:0, resources:"System Administrator — 4 hrs", scheduled_completion:"2025-05-01", milestones:[{desc:"Remove wildcard ingress rules",due:"2025-04-15",status:"In Progress"},{desc:"Apply allow-list per STIG guidance",due:"2025-04-22",status:"Pending"},{desc:"Validate with ACAS re-scan",due:"2025-05-01",status:"Pending"}], milestone_changes:"None", status:"Ongoing", comments:"SCA notified Apr 1. ISSM tracking weekly. Re-scan evidence required before closure.", system:"ACME-NIPR-01", created:"2025-04-01", updated:"2025-04-08" },
  { id:"POAM-002", control:"SC-28", cat:"II", severity:"H", weakness:"EBS root volumes not encrypted at rest on production instances", source:"AWS Security Hub", cve:"", poc:"SA", action_owners:["SA","PM"], cost:2400, resources:"Cloud Engineer — 16 hrs. Ongoing storage cost ~$200/mo.", scheduled_completion:"2025-06-15", milestones:[{desc:"Enable EBS encryption default in all regions",due:"2025-05-01",status:"Complete"},{desc:"Snapshot and re-create affected volumes",due:"2025-06-01",status:"In Progress"},{desc:"Validate with Security Hub finding closure",due:"2025-06-15",status:"Pending"}], milestone_changes:"Milestone 2 delayed 2 weeks — vendor migration tool incompatible with current AMI version. Updated ETA 2025-06-01.", status:"Ongoing", comments:"Cost estimate submitted to PM for budget approval. ISSM aware of delay.", system:"ACME-NIPR-01", created:"2025-04-01", updated:"2025-04-10" },
  { id:"POAM-003", control:"IA-2(1)", cat:"II", severity:"H", weakness:"IAM console user without MFA — credential theft risk", source:"ACAS / Tenable.sc", cve:"", poc:"ISSO", action_owners:["SA","ISSO"], cost:0, resources:"ISSO — 2 hrs. SA — 1 hr.", scheduled_completion:"2025-05-01", milestones:[{desc:"Enable MFA for all console users via IAM policy",due:"2025-04-18",status:"Complete"},{desc:"Attach deny-without-MFA SCP at org level",due:"2025-04-25",status:"In Progress"}], milestone_changes:"None", status:"Ongoing", comments:"Milestone 1 complete as of Apr 12. SCP deployment in progress.", system:"ACME-NIPR-02", created:"2025-04-01", updated:"2025-04-12" },
  { id:"POAM-004", control:"SR-2", cat:"II", severity:"M", weakness:"No Supply Chain Risk Management plan documented per NIST 800-161", source:"Self-Assessment", cve:"", poc:"PM", action_owners:["PM","ISSM","ISSO"], cost:15000, resources:"External consultant — 80 hrs. PM coordination — 20 hrs. ISSM review — 8 hrs.", scheduled_completion:"2025-07-30", milestones:[{desc:"Identify all third-party SW/HW in boundary",due:"2025-05-15",status:"In Progress"},{desc:"Draft SCRM plan per 800-161",due:"2025-06-30",status:"Pending"},{desc:"ISSM review and approval",due:"2025-07-15",status:"Pending"},{desc:"AO acceptance",due:"2025-07-30",status:"Pending"}], milestone_changes:"Consultant availability pushed start date 2 weeks. Original start 2025-04-15, now 2025-04-29.", status:"Ongoing", comments:"PM coordinating SOW with procurement. SCA aware of timeline. Budget approved.", system:"ACME-NIPR-01", created:"2025-04-01", updated:"2025-04-09" },
  { id:"POAM-005", control:"IR-4", cat:"II", severity:"M", weakness:"IR plan not tested — no simulation conducted in 12 months", source:"Self-Assessment", cve:"", poc:"ISSO", action_owners:["ISSO","ISSM","PM"], cost:5000, resources:"IR tabletop facilitator (external). ISSO — 16 hrs. All stakeholders — 4 hrs.", scheduled_completion:"2025-06-30", milestones:[{desc:"Schedule IR tabletop exercise",due:"2025-05-01",status:"In Progress"},{desc:"Conduct IR simulation with stakeholders",due:"2025-06-15",status:"Pending"},{desc:"Document lessons learned, update IR plan",due:"2025-06-30",status:"Pending"}], milestone_changes:"None", status:"Ongoing", comments:"ISSM briefing PM on exercise schedule this week. Tabletop vendor selected.", system:"ACME-NIPR-01", created:"2025-04-01", updated:"2025-04-07" },
  { id:"POAM-006", control:"CM-6", cat:"III", severity:"M", weakness:"DHCP server not configured per Network Infrastructure STIG V-220713", source:"STIG / SCAP", cve:"", poc:"NA", action_owners:["NA"], cost:0, resources:"Network Administrator — 3 hrs", scheduled_completion:"2025-07-01", milestones:[{desc:"Apply STIG-compliant DHCP config",due:"2025-06-15",status:"Pending"},{desc:"Validate with SCAP re-scan",due:"2025-07-01",status:"Pending"}], milestone_changes:"Vendor patch not available until Q3 2025. Workaround config being evaluated by NA. Awaiting vendor confirmation.", status:"Ongoing", comments:"NA coordinating with vendor. SCA notified of patch delay. Workaround under review.", system:"ACME-NIPR-02", created:"2025-04-01", updated:"2025-04-11" },
  { id:"POAM-007", control:"AU-2", cat:"II", severity:"M", weakness:"CloudTrail not multi-region — audit gaps on global service events", source:"AWS Security Hub", cve:"", poc:"SA", action_owners:["SA","ISSO"], cost:120, resources:"SA — 4 hrs. CloudTrail storage ~$120/mo ongoing.", scheduled_completion:"2025-04-15", milestones:[{desc:"Convert to multi-region trail",due:"2025-04-10",status:"Complete"},{desc:"Enable global service events",due:"2025-04-12",status:"Complete"},{desc:"Validate with Security Hub",due:"2025-04-15",status:"In Progress"}], milestone_changes:"None", status:"Remediated", comments:"All milestones complete. Final Security Hub validation in progress. ISSM notified of closure.", system:"ACME-NIPR-01", created:"2025-04-01", updated:"2025-04-12" },
  { id:"POAM-008", control:"RA-5", cat:"II", severity:"H", weakness:"EC2 instances not enrolled in Inspector v2 — CVE window unknown", source:"AWS Security Hub", cve:"", poc:"SA", action_owners:["SA","ISSO"], cost:180, resources:"SA — 6 hrs. Inspector v2 ~$180/mo for current instance count.", scheduled_completion:"2025-05-01", milestones:[{desc:"Enable Inspector v2 all regions",due:"2025-04-20",status:"In Progress"},{desc:"Deploy SSM agent on all EC2",due:"2025-04-25",status:"Pending"},{desc:"Review initial findings",due:"2025-05-01",status:"Pending"}], milestone_changes:"None", status:"Ongoing", comments:"PM approved Inspector cost. SA scheduling SSM deployment in maintenance window Sat Apr 19.", system:"ACME-NIPR-02", created:"2025-04-01", updated:"2025-04-08" },
];
// ── Primitives ────────────────────────────────────────────────────────────────
function Badge({ label, color, sm }) {
  return <span style={{ fontFamily:"monospace", fontSize:sm?8:10, fontWeight:700, color, background:`${color}18`, border:`1px solid ${color}40`, borderRadius:3, padding:sm?"1px 5px":"2px 8px", whiteSpace:"nowrap" }}>{label}</span>;
}
function Inp({ value, onChange, type="text", placeholder="", style={} }) {
  const th = useTheme(); const t=T[th];
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{ background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:5, color:t.text, padding:"5px 9px", fontSize:11, fontFamily:"inherit", outline:"none", width:"100%", ...style }} />;
}
function Sel({ value, onChange, options, style={} }) {
  const th = useTheme(); const t=T[th];
  return <select value={value} onChange={e=>onChange(e.target.value)}
    style={{ background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:5, color:t.text, padding:"5px 8px", fontSize:11, fontFamily:"monospace", outline:"none", cursor:"pointer", ...style }}>
    {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
  </select>;
}
// ── All NIST 800-53 Rev 5 base control IDs ───────────────────────────────
const NIST_CONTROLS = [
  // AC
  "AC-1","AC-2","AC-2(1)","AC-2(2)","AC-2(3)","AC-2(4)","AC-2(5)","AC-2(6)","AC-2(7)","AC-2(9)","AC-2(10)","AC-2(11)","AC-2(12)","AC-2(13)",
  "AC-3","AC-3(2)","AC-3(3)","AC-3(4)","AC-3(5)","AC-3(7)","AC-3(8)","AC-3(9)","AC-3(10)","AC-3(11)","AC-3(12)","AC-3(13)","AC-3(14)","AC-3(15)",
  "AC-4","AC-4(1)","AC-4(2)","AC-4(3)","AC-4(4)","AC-4(5)","AC-4(6)","AC-4(7)","AC-4(8)","AC-4(9)","AC-4(10)","AC-4(11)","AC-4(12)","AC-4(13)","AC-4(14)","AC-4(15)","AC-4(16)","AC-4(17)","AC-4(18)","AC-4(19)","AC-4(20)","AC-4(21)","AC-4(22)","AC-4(23)","AC-4(24)","AC-4(25)","AC-4(26)","AC-4(27)","AC-4(28)","AC-4(29)","AC-4(30)","AC-4(31)","AC-4(32)",
  "AC-5","AC-6","AC-6(1)","AC-6(2)","AC-6(3)","AC-6(4)","AC-6(5)","AC-6(6)","AC-6(7)","AC-6(8)","AC-6(9)","AC-6(10)",
  "AC-7","AC-7(1)","AC-7(2)","AC-7(3)","AC-7(4)","AC-8","AC-10","AC-11","AC-11(1)","AC-12","AC-12(1)","AC-14","AC-17","AC-17(1)","AC-17(2)","AC-17(3)","AC-17(4)","AC-17(5)","AC-17(6)","AC-17(9)","AC-17(10)","AC-18","AC-18(1)","AC-18(2)","AC-18(3)","AC-18(4)","AC-18(5)","AC-19","AC-19(5)","AC-20","AC-20(1)","AC-20(2)","AC-20(3)","AC-20(4)","AC-21","AC-22","AC-23","AC-24","AC-24(1)","AC-24(2)","AC-25",
  // AT
  "AT-1","AT-2","AT-2(1)","AT-2(2)","AT-2(3)","AT-2(4)","AT-2(5)","AT-2(6)","AT-3","AT-3(1)","AT-3(2)","AT-3(3)","AT-3(4)","AT-3(5)","AT-4","AT-5","AT-6",
  // AU
  "AU-1","AU-2","AU-2(3)","AU-3","AU-3(1)","AU-3(2)","AU-4","AU-4(1)","AU-5","AU-5(1)","AU-5(2)","AU-5(3)","AU-5(4)","AU-5(5)","AU-6","AU-6(1)","AU-6(2)","AU-6(3)","AU-6(4)","AU-6(5)","AU-6(6)","AU-6(7)","AU-6(8)","AU-6(9)","AU-6(10)","AU-7","AU-7(1)","AU-7(2)","AU-8","AU-8(1)","AU-8(2)","AU-9","AU-9(1)","AU-9(2)","AU-9(3)","AU-9(4)","AU-9(5)","AU-9(6)","AU-9(7)","AU-10","AU-10(1)","AU-10(2)","AU-10(3)","AU-10(4)","AU-10(5)","AU-11","AU-11(1)","AU-12","AU-12(1)","AU-12(2)","AU-12(3)","AU-13","AU-13(1)","AU-13(2)","AU-13(3)","AU-14","AU-14(1)","AU-14(2)","AU-14(3)","AU-15","AU-16","AU-16(1)","AU-16(2)",
  // CA
  "CA-1","CA-2","CA-2(1)","CA-2(2)","CA-2(3)","CA-3","CA-3(1)","CA-3(2)","CA-3(3)","CA-3(4)","CA-3(5)","CA-3(6)","CA-3(7)","CA-5","CA-5(1)","CA-6","CA-6(1)","CA-6(2)","CA-7","CA-7(1)","CA-7(2)","CA-7(3)","CA-7(4)","CA-7(5)","CA-7(6)","CA-8","CA-8(1)","CA-8(2)","CA-8(3)","CA-9","CA-9(1)",
  // CM
  "CM-1","CM-2","CM-2(1)","CM-2(2)","CM-2(3)","CM-2(6)","CM-2(7)","CM-3","CM-3(1)","CM-3(2)","CM-3(3)","CM-3(4)","CM-3(5)","CM-3(6)","CM-3(7)","CM-3(8)","CM-4","CM-4(1)","CM-4(2)","CM-5","CM-5(1)","CM-5(2)","CM-5(3)","CM-5(4)","CM-5(5)","CM-5(6)","CM-6","CM-6(1)","CM-6(2)","CM-6(3)","CM-6(4)","CM-7","CM-7(1)","CM-7(2)","CM-7(3)","CM-7(4)","CM-7(5)","CM-7(6)","CM-7(7)","CM-7(8)","CM-8","CM-8(1)","CM-8(2)","CM-8(3)","CM-8(4)","CM-8(5)","CM-8(6)","CM-8(7)","CM-8(8)","CM-8(9)","CM-9","CM-9(1)","CM-10","CM-10(1)","CM-11","CM-11(1)","CM-11(2)","CM-11(3)","CM-12","CM-12(1)","CM-13","CM-14",
  // CP
  "CP-1","CP-2","CP-2(1)","CP-2(2)","CP-2(3)","CP-2(4)","CP-2(5)","CP-2(6)","CP-2(7)","CP-2(8)","CP-3","CP-3(1)","CP-3(2)","CP-4","CP-4(1)","CP-4(2)","CP-4(3)","CP-4(4)","CP-6","CP-6(1)","CP-6(2)","CP-6(3)","CP-7","CP-7(1)","CP-7(2)","CP-7(3)","CP-7(4)","CP-7(5)","CP-7(6)","CP-8","CP-8(1)","CP-8(2)","CP-8(3)","CP-8(4)","CP-8(5)","CP-9","CP-9(1)","CP-9(2)","CP-9(3)","CP-9(4)","CP-9(5)","CP-9(6)","CP-9(7)","CP-9(8)","CP-10","CP-10(2)","CP-10(4)","CP-10(6)",
  // IA
  "IA-1","IA-2","IA-2(1)","IA-2(2)","IA-2(3)","IA-2(4)","IA-2(5)","IA-2(6)","IA-2(7)","IA-2(8)","IA-2(9)","IA-2(10)","IA-2(11)","IA-2(12)","IA-2(13)","IA-3","IA-3(1)","IA-3(2)","IA-3(3)","IA-3(4)","IA-4","IA-4(1)","IA-4(2)","IA-4(3)","IA-4(4)","IA-4(5)","IA-4(6)","IA-4(7)","IA-4(8)","IA-4(9)","IA-5","IA-5(1)","IA-5(2)","IA-5(3)","IA-5(4)","IA-5(5)","IA-5(6)","IA-5(7)","IA-5(8)","IA-5(9)","IA-5(10)","IA-5(11)","IA-5(12)","IA-5(13)","IA-5(14)","IA-5(15)","IA-5(16)","IA-5(17)","IA-5(18)","IA-6","IA-7","IA-8","IA-8(1)","IA-8(2)","IA-8(3)","IA-8(4)","IA-8(5)","IA-8(6)","IA-9","IA-9(1)","IA-9(2)","IA-10","IA-11","IA-12","IA-12(1)","IA-12(2)","IA-12(3)","IA-12(4)","IA-12(5)","IA-12(6)","IA-13",
  // IR
  "IR-1","IR-2","IR-2(1)","IR-2(2)","IR-2(3)","IR-3","IR-3(1)","IR-3(2)","IR-4","IR-4(1)","IR-4(2)","IR-4(3)","IR-4(4)","IR-4(5)","IR-4(6)","IR-4(7)","IR-4(8)","IR-4(9)","IR-4(10)","IR-4(11)","IR-4(12)","IR-4(13)","IR-4(14)","IR-5","IR-5(1)","IR-6","IR-6(1)","IR-6(2)","IR-6(3)","IR-7","IR-7(1)","IR-7(2)","IR-8","IR-8(1)","IR-9","IR-9(1)","IR-9(2)","IR-9(3)","IR-9(4)","IR-10",
  // MA
  "MA-1","MA-2","MA-2(2)","MA-3","MA-3(1)","MA-3(2)","MA-3(3)","MA-3(4)","MA-4","MA-4(1)","MA-4(2)","MA-4(3)","MA-4(4)","MA-4(5)","MA-4(6)","MA-4(7)","MA-5","MA-5(1)","MA-5(2)","MA-5(3)","MA-5(4)","MA-6","MA-6(1)","MA-6(2)","MA-6(3)",
  // MP
  "MP-1","MP-2","MP-3","MP-4","MP-4(1)","MP-4(2)","MP-5","MP-5(3)","MP-5(4)","MP-6","MP-6(1)","MP-6(2)","MP-6(3)","MP-7","MP-7(1)","MP-7(2)","MP-8",
  // PE
  "PE-1","PE-2","PE-2(1)","PE-2(2)","PE-2(3)","PE-3","PE-3(1)","PE-3(2)","PE-3(3)","PE-3(4)","PE-3(5)","PE-3(6)","PE-4","PE-5","PE-5(1)","PE-5(2)","PE-5(3)","PE-6","PE-6(1)","PE-6(2)","PE-6(3)","PE-6(4)","PE-8","PE-8(1)","PE-8(2)","PE-9","PE-10","PE-10(1)","PE-11","PE-11(1)","PE-11(2)","PE-12","PE-13","PE-13(1)","PE-13(2)","PE-13(3)","PE-13(4)","PE-14","PE-14(1)","PE-14(2)","PE-14(3)","PE-15","PE-15(1)","PE-16","PE-17","PE-18","PE-19","PE-19(1)","PE-20","PE-21","PE-22","PE-23",
  // PL
  "PL-1","PL-2","PL-4","PL-4(1)","PL-7","PL-8","PL-8(1)","PL-8(2)","PL-9","PL-10","PL-11",
  // PM
  "PM-1","PM-2","PM-3","PM-4","PM-5","PM-5(1)","PM-6","PM-7","PM-7(1)","PM-8","PM-9","PM-9(1)","PM-10","PM-11","PM-11(1)","PM-12","PM-13","PM-14","PM-15","PM-16","PM-16(1)","PM-17","PM-18","PM-19","PM-20","PM-20(1)","PM-21","PM-22","PM-23","PM-24","PM-25","PM-26","PM-27","PM-28","PM-29","PM-30","PM-30(1)","PM-31","PM-32",
  // PS
  "PS-1","PS-2","PS-3","PS-3(1)","PS-3(2)","PS-3(3)","PS-4","PS-4(1)","PS-4(2)","PS-5","PS-6","PS-6(1)","PS-6(2)","PS-6(3)","PS-7","PS-8","PS-9",
  // PT
  "PT-1","PT-2","PT-2(1)","PT-2(2)","PT-3","PT-3(1)","PT-3(2)","PT-4","PT-4(1)","PT-4(2)","PT-5","PT-5(1)","PT-5(2)","PT-6","PT-6(1)","PT-6(2)","PT-7","PT-7(1)","PT-7(2)","PT-8",
  // RA
  "RA-1","RA-2","RA-2(1)","RA-3","RA-3(1)","RA-3(2)","RA-3(3)","RA-3(4)","RA-3(5)","RA-5","RA-5(1)","RA-5(2)","RA-5(3)","RA-5(4)","RA-5(5)","RA-5(6)","RA-5(7)","RA-5(8)","RA-5(9)","RA-5(10)","RA-5(11)","RA-7","RA-8","RA-9","RA-10",
  // SA
  "SA-1","SA-2","SA-3","SA-4","SA-4(1)","SA-4(2)","SA-4(3)","SA-4(4)","SA-4(5)","SA-4(6)","SA-4(7)","SA-4(8)","SA-4(9)","SA-4(10)","SA-4(11)","SA-5","SA-8","SA-8(1)","SA-8(2)","SA-8(3)","SA-8(4)","SA-8(5)","SA-8(6)","SA-8(7)","SA-8(8)","SA-8(9)","SA-8(10)","SA-8(11)","SA-8(12)","SA-8(13)","SA-8(14)","SA-8(15)","SA-8(16)","SA-8(17)","SA-8(18)","SA-8(19)","SA-8(20)","SA-8(21)","SA-8(22)","SA-8(23)","SA-8(24)","SA-8(25)","SA-8(26)","SA-8(27)","SA-8(28)","SA-8(29)","SA-8(30)","SA-8(31)","SA-8(32)","SA-8(33)","SA-9","SA-9(1)","SA-9(2)","SA-9(3)","SA-9(4)","SA-9(5)","SA-9(6)","SA-9(7)","SA-9(8)","SA-10","SA-10(1)","SA-10(2)","SA-10(3)","SA-10(4)","SA-10(5)","SA-10(6)","SA-11","SA-11(1)","SA-11(2)","SA-11(3)","SA-11(4)","SA-11(5)","SA-11(6)","SA-11(7)","SA-11(8)","SA-11(9)","SA-15","SA-15(1)","SA-15(2)","SA-15(3)","SA-15(4)","SA-15(5)","SA-15(6)","SA-15(7)","SA-15(8)","SA-15(9)","SA-15(10)","SA-15(11)","SA-15(12)","SA-15(13)","SA-16","SA-17","SA-20","SA-21","SA-22","SA-23","SA-24",
  // SC
  "SC-1","SC-2","SC-2(1)","SC-2(2)","SC-3","SC-3(1)","SC-3(2)","SC-3(3)","SC-3(4)","SC-3(5)","SC-4","SC-4(1)","SC-4(2)","SC-5","SC-5(1)","SC-5(2)","SC-5(3)","SC-7","SC-7(3)","SC-7(4)","SC-7(5)","SC-7(6)","SC-7(7)","SC-7(8)","SC-7(9)","SC-7(10)","SC-7(11)","SC-7(12)","SC-7(13)","SC-7(14)","SC-7(15)","SC-7(16)","SC-7(17)","SC-7(18)","SC-7(19)","SC-7(20)","SC-7(21)","SC-7(22)","SC-7(23)","SC-7(24)","SC-7(25)","SC-7(26)","SC-7(27)","SC-7(28)","SC-7(29)","SC-8","SC-8(1)","SC-8(2)","SC-8(3)","SC-8(4)","SC-8(5)","SC-10","SC-11","SC-11(1)","SC-12","SC-12(1)","SC-12(2)","SC-12(3)","SC-12(4)","SC-12(5)","SC-13","SC-13(1)","SC-13(2)","SC-13(3)","SC-13(4)","SC-15","SC-15(1)","SC-15(2)","SC-15(3)","SC-15(4)","SC-17","SC-18","SC-18(1)","SC-18(2)","SC-18(3)","SC-18(4)","SC-18(5)","SC-20","SC-20(1)","SC-20(2)","SC-21","SC-21(1)","SC-22","SC-23","SC-23(1)","SC-23(2)","SC-23(3)","SC-25","SC-26","SC-27","SC-28","SC-28(1)","SC-28(2)","SC-28(3)","SC-29","SC-29(1)","SC-29(2)","SC-30","SC-30(1)","SC-30(2)","SC-30(3)","SC-30(4)","SC-30(5)","SC-31","SC-31(1)","SC-31(2)","SC-31(3)","SC-32","SC-32(1)","SC-34","SC-34(1)","SC-34(2)","SC-34(3)","SC-36","SC-36(1)","SC-36(2)","SC-37","SC-37(1)","SC-38","SC-39","SC-39(1)","SC-39(2)","SC-40","SC-40(1)","SC-40(2)","SC-40(3)","SC-40(4)","SC-41","SC-43","SC-44","SC-45","SC-45(1)","SC-45(2)","SC-47","SC-48","SC-49","SC-50","SC-51",
  // SI
  "SI-1","SI-2","SI-2(1)","SI-2(2)","SI-2(3)","SI-2(4)","SI-2(5)","SI-2(6)","SI-2(7)","SI-3","SI-3(1)","SI-3(2)","SI-3(3)","SI-3(4)","SI-3(5)","SI-3(6)","SI-3(7)","SI-3(8)","SI-3(9)","SI-3(10)","SI-4","SI-4(1)","SI-4(2)","SI-4(3)","SI-4(4)","SI-4(5)","SI-4(6)","SI-4(7)","SI-4(8)","SI-4(9)","SI-4(10)","SI-4(11)","SI-4(12)","SI-4(13)","SI-4(14)","SI-4(15)","SI-4(16)","SI-4(17)","SI-4(18)","SI-4(19)","SI-4(20)","SI-4(21)","SI-4(22)","SI-4(23)","SI-4(24)","SI-4(25)","SI-5","SI-5(1)","SI-6","SI-6(1)","SI-6(2)","SI-6(3)","SI-7","SI-7(1)","SI-7(2)","SI-7(3)","SI-7(4)","SI-7(5)","SI-7(6)","SI-7(7)","SI-7(8)","SI-7(9)","SI-7(10)","SI-7(11)","SI-7(12)","SI-7(13)","SI-7(14)","SI-7(15)","SI-7(16)","SI-7(17)","SI-8","SI-8(1)","SI-8(2)","SI-8(3)","SI-10","SI-10(1)","SI-10(2)","SI-10(3)","SI-10(4)","SI-10(5)","SI-10(6)","SI-12","SI-12(1)","SI-12(2)","SI-12(3)","SI-13","SI-13(1)","SI-13(2)","SI-13(3)","SI-13(4)","SI-13(5)","SI-14","SI-14(1)","SI-15","SI-16","SI-17","SI-18","SI-18(1)","SI-18(2)","SI-18(3)","SI-18(4)","SI-18(5)","SI-19","SI-19(1)","SI-19(2)","SI-19(3)","SI-19(4)","SI-20","SI-21","SI-22","SI-23",
  // SR
  "SR-1","SR-2","SR-2(1)","SR-3","SR-3(1)","SR-3(2)","SR-3(3)","SR-4","SR-4(1)","SR-4(2)","SR-4(3)","SR-4(4)","SR-5","SR-5(1)","SR-5(2)","SR-6","SR-6(1)","SR-7","SR-8","SR-9","SR-9(1)","SR-10","SR-11","SR-11(1)","SR-11(2)","SR-11(3)","SR-12",
];
// ── DoD tools for source dropdown ─────────────────────────────────────────
const DOD_SOURCES = [
  "ACAS / Nessus","Tenable.sc","DISA STIG / SCAP","Self-Assessment","Penetration Test",
  "CrowdStrike Falcon","Splunk SIEM","Trellix / HBSS","eMASS","AWS Security Hub",
  "Azure Defender","WSUS / SCCM","Group Policy (GPO)","Active Directory Audit",
  "Network Scanner","Palo Alto Firewall","Juniper / Cisco STIG","Ivanti VPN Audit",
  "Zscaler ZIA Audit","Nessus Compliance Plugin","DIBCAC Assessment","C3PAO Assessment",
  "ISSM Review","ISSO Review","SCA Finding","Inspector General (IG)","Other",
];
// ── Searchable combo select ───────────────────────────────────────────────
function ComboSelect({ value, onChange, options, placeholder = "Type to search or select...", allowCustom = true }) {
  const th = useTheme(); const t = T[th];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50); // cap at 50 for performance
  const handleSelect = (opt) => {
    onChange(opt);
    setSearch("");
    setOpen(false);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && allowCustom && search.trim()) {
      handleSelect(search.trim());
    }
    if (e.key === "Escape") setOpen(false);
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)}
        style={{ background: t.input, border: `1px solid ${t.inputBorder || C.inputBorder}`, borderRadius: 5, padding: "5px 10px", color: value ? t.white : t.mute, cursor: "pointer", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 32 }}>
        <span>{value || placeholder}</span>
        <span style={{ color: t.mute, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: t.panel, border: `1px solid #1A3A5C`, borderRadius: 5, zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", maxHeight: 260, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "6px 8px", borderBottom: `1px solid #0D1E2E` }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={allowCustom ? "Search or type custom value + Enter" : "Search..."}
              style={{ width: "100%", background: t.input, border: `1px solid #1A3A5C`, borderRadius: 4, color: t.white, padding: "4px 8px", fontSize: 11, outline: "none", fontFamily: "monospace" }} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 && allowCustom && search.trim() && (
              <div onClick={() => handleSelect(search.trim())}
                style={{ padding: "8px 12px", cursor: "pointer", color: "#00D4AA", fontSize: 11, fontFamily: "monospace" }}>
                + Use "{search.trim()}"
              </div>
            )}
            {filtered.map(opt => (
              <div key={opt} onClick={() => handleSelect(opt)}
                style={{ padding: "7px 12px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", color: opt === value ? "#00D4AA" : t.textDim, background: opt === value ? "rgba(0,212,170,0.08)" : "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = opt === value ? "rgba(0,212,170,0.08)" : "transparent"}>
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function TA({ value, onChange, placeholder="", rows=3 }) {
  const th = useTheme(); const t=T[th];
  return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:5, color:t.text, padding:"7px 9px", fontSize:11, fontFamily:"inherit", outline:"none", width:"100%", resize:"vertical", lineHeight:1.6 }} />;
}
function Label({ children }) {
  const th = useTheme(); const t=T[th];
  return <div style={{ fontFamily:"monospace", fontSize:10, color:t.mute, letterSpacing:0.8, marginBottom:5 }}>{children}</div>;
}
function SectionCard({ title, color, children }) {
  const th = useTheme(); const t=T[th];
  return (
    <div style={{ background:t.panel2, border:`1px solid ${t.border}`, borderRadius:8, padding:14, marginBottom:12 }}>
      <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color, marginBottom:10 }}>{title}</div>
      {children}
    </div>
  );
}
// ── Detail panel ──────────────────────────────────────────────────────────────
function Detail({ poam, onUpdate, onClose }) {
  const th = useTheme(); const t=T[th];
  const [tab, setTab] = useState("info");
  const [p, setP] = useState({...poam});
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const up = (k,v) => { const n={...p,[k]:v}; setP(n); setDirty(true); setSaved(false); };
  const upMs = (i,k,v) => { const ms=[...p.milestones]; ms[i]={...ms[i],[k]:v}; up("milestones",ms); };
  const handleSave = () => {
    onUpdate(p);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const handleDiscard = () => {
    setP({...poam});
    setDirty(false);
    setSaved(false);
  };
  const TABS = [{id:"info",l:"Info"},{id:"owners",l:"Owners"},{id:"milestones",l:`Milestones (${p.milestones.length})`},{id:"cost",l:"Cost & Resources"},{id:"comments",l:"Comments"}];
  return (
    <div style={{ background:t.panel, border:`1px solid ${t.borderMd}`, borderRadius:10, display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"13px 16px", borderBottom:`1px solid ${t.border}`, background:t.panel2 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:A.teal }}>{p.id}</span>
              <Badge label={`CAT ${p.cat}`} color={CAT_C[p.cat]||A.orange} sm />
              <Badge label={SEV[p.severity]?.l||"Med"} color={SEV[p.severity]?.c||A.gold} sm />
              <Badge label={p.status} color={p.status==="Remediated"?A.green:p.status==="Delayed"?A.red:p.status==="Risk Accepted"?A.purple:A.orange} sm />
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:t.white, lineHeight:1.4 }}>{p.weakness||"New POAM — edit fields below"}</div>
            <div style={{ fontFamily:"monospace", fontSize:11, color:t.mute, marginTop:3 }}>{p.control} · {p.source||"—"} · {p.system||"—"}</div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center", marginLeft:10, flexShrink:0 }}>
              {saved && (
                <span style={{ fontFamily:"monospace", fontSize:10, color:A.green, fontWeight:700 }}>✓ SAVED</span>
              )}
              {dirty && (
                <button onClick={handleDiscard}
                  style={{ fontFamily:"monospace", background:"transparent", border:`1px solid ${t.border}`, color:t.mute, borderRadius:4, padding:"5px 10px", cursor:"pointer", fontSize:10 }}>
                  DISCARD
                </button>
              )}
              <button onClick={handleSave}
                style={{ fontFamily:"monospace", background:dirty?A.teal:"transparent", border:`1px solid ${dirty?A.teal:t.border}`, color:dirty?C.headerBg:t.mute, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10, fontWeight:dirty?700:400 }}>
                {dirty ? "✓ SAVE" : "SAVED"}
              </button>
              <button onClick={onClose}
                style={{ background:"transparent", border:`1px solid ${t.border}`, color:t.mute, borderRadius:4, padding:"5px 9px", cursor:"pointer", fontSize:11 }}>✕</button>
            </div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${t.border}`, background:t.panel2, overflowX:"auto" }}>
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)}
            style={{ background:"none", border:"none", borderBottom:`2px solid ${tab===tb.id?A.teal:"transparent"}`, color:tab===tb.id?A.teal:t.mute, padding:"8px 12px", cursor:"pointer", fontSize:10, fontFamily:"monospace", fontWeight:tab===tb.id?700:400, whiteSpace:"nowrap" }}>
            {tb.l}
          </button>
        ))}
      </div>
      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:16 }}>
        {tab==="info" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                ["NIST CONTROL", <ComboSelect value={p.control} onChange={v=>up("control",v)} options={NIST_CONTROLS} placeholder="Search controls (e.g. SC-7, AC-2(1))..." allowCustom={true} />],
                ["SOURCE / TOOL", <ToolPicker value={p.source} onChange={v=>up("source",v)} t={t} />],
                ["CAT LEVEL", <Sel value={p.cat} onChange={v=>up("cat",v)} options={["I","II","III"]} />],
                ["SEVERITY", <Sel value={p.severity} onChange={v=>up("severity",v)} options={[{v:"H",l:"High (H)"},{v:"M",l:"Medium (M)"},{v:"L",l:"Low (L)"}]} />],
                ["STATUS", <Sel value={p.status} onChange={v=>up("status",v)} options={STATUSES} />],
                ["SCHEDULED COMPLETION", <Inp type="date" value={p.scheduled_completion} onChange={v=>up("scheduled_completion",v)} />],
              ].map(([label,field],i)=>(
                <div key={i}><Label>{label}</Label>{field}</div>
              ))}
            </div>
            <div><Label>WEAKNESS DESCRIPTION</Label><TA value={p.weakness} onChange={v=>up("weakness",v)} placeholder="Describe the vulnerability, gap, or non-compliant configuration..." rows={3} /></div>
            <div><Label>SYSTEM</Label><Inp value={p.system} onChange={v=>up("system",v)} placeholder="e.g. ACME-NIPR-01" /></div>
          </div>
        )}
        {tab==="owners" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <SectionCard title="PRIMARY POINT OF CONTACT (POC)" color={A.teal}>
              <Label>WHO IS ACCOUNTABLE FOR THIS POAM</Label>
              <Sel value={p.poc} onChange={v=>up("poc",v)} options={ROLES.map(r=>({v:r,l:`${r} — ${ROLE_LABELS[r]}`}))} />
              <div style={{ fontFamily:"monospace", fontSize:11, color:T[th].mute, marginTop:7 }}>POC is responsible for driving all milestones to completion and reporting status to ISSM.</div>
            </SectionCard>
            <SectionCard title="ACTION OWNERS — WHO HAS TASKS" color={A.blue}>
              <Label>SELECT ALL ROLES WITH ACTION ITEMS ON THIS POAM</Label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:10 }}>
                {ROLES.map(r=>{
                  const on=p.action_owners.includes(r);
                  return (
                    <div key={r} onClick={()=>up("action_owners",on?p.action_owners.filter(x=>x!==r):[...p.action_owners,r])}
                      style={{ padding:"6px 12px", borderRadius:6, cursor:"pointer", background:on?`${A.blue}14`:"transparent", border:`1px solid ${on?A.blue:T[th].border}`, color:on?A.blue:T[th].mute, fontFamily:"monospace", fontSize:10, fontWeight:on?700:400, userSelect:"none" }}>
                      {on?"✓ ":""}{r} — {ROLE_LABELS[r]}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontFamily:"monospace", fontSize:11, color:T[th].mute }}>Current: {p.action_owners.length>0?p.action_owners.join(", "):"None assigned"}</div>
            </SectionCard>
            <SectionCard title="COMMON OWNERSHIP BY FINDING TYPE" color={T[th].mute}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 110px", gap:0 }}>
                {[["Supply Chain (SR)","PM","PM, ISSM, ISSO"],["DHCP / Network Misconfiguration","NA","NA"],["STIG Checks (CM-6)","SA / NA","SA, NA, ISSO"],["IR Plan / Simulation","ISSO","ISSO, ISSM, PM"],["Vulnerability Patching","SA","SA, ISSO"],["Access Control (AC/IA)","SA","SA, ISSO"],["Audit Logging (AU)","SA","SA, ISSO"],["Risk Assessment (RA)","ISSO","ISSO, ISSM"]].map(([type,poc,owners],i)=>(
                  <>
                    <div key={`t${i}`} style={{ fontSize:10, color:T[th].dim, padding:"5px 0", borderBottom:`1px solid ${T[th].border}` }}>{type}</div>
                    <div key={`p${i}`} style={{ fontFamily:"monospace", fontSize:11, color:A.teal, padding:"5px 0", borderBottom:`1px solid ${T[th].border}` }}>{poc}</div>
                    <div key={`o${i}`} style={{ fontFamily:"monospace", fontSize:11, color:T[th].mute, padding:"5px 0", borderBottom:`1px solid ${T[th].border}` }}>{owners}</div>
                  </>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
        {tab==="milestones" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {p.milestones.map((ms,i)=>(
              <div key={i} style={{ background:T[th].panel2, border:`1px solid ${T[th].border}`, borderRadius:8, padding:13 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:9 }}>
                  <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:A.teal, minWidth:22 }}>#{i+1}</span>
                  <Sel value={ms.status} onChange={v=>upMs(i,"status",v)} options={MS_STATUSES} style={{ width:130 }} />
                  <Inp type="date" value={ms.due} onChange={v=>upMs(i,"due",v)} style={{ width:140 }} />
                  <div style={{ width:10, height:10, borderRadius:"50%", background:ms.status==="Complete"?A.green:ms.status==="In Progress"?A.teal:ms.status==="Blocked"?A.red:T[th].mute, flexShrink:0 }} />
                  <button onClick={()=>up("milestones",p.milestones.filter((_,j)=>j!==i))}
                    style={{ background:"transparent", border:`1px solid ${A.red}40`, color:A.red, borderRadius:4, padding:"2px 7px", cursor:"pointer", fontSize:10, marginLeft:"auto" }}>✕</button>
                </div>
                <Inp value={ms.desc} onChange={v=>upMs(i,"desc",v)} placeholder="Describe this milestone action item..." />
              </div>
            ))}
            <button onClick={()=>up("milestones",[...p.milestones,{desc:"",due:"",status:"Pending"}])}
              style={{ background:`${A.teal}0E`, border:`1px dashed ${A.teal}60`, color:A.teal, borderRadius:7, padding:"9px", cursor:"pointer", fontFamily:"monospace", fontSize:11, fontWeight:700 }}>+ ADD MILESTONE</button>
            <div style={{ marginTop:4 }}>
              <Label>MILESTONE CHANGES / ROLLBACKS / DELAYS</Label>
              <TA value={p.milestone_changes} onChange={v=>up("milestone_changes",v)} rows={3}
                placeholder="Document schedule changes — vendor patch delays, tool delivery issues, rollbacks, shipping delays, contractor unavailability..." />
              <div style={{ fontFamily:"monospace", fontSize:11, color:T[th].mute, marginTop:5 }}>
                Examples: vendor patch Q3 delayed · hardware shipment delayed 6 weeks · rollback required after failed deployment · contractor unable to meet delivery date
              </div>
            </div>
          </div>
        )}
        {tab==="cost" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <SectionCard title="ESTIMATED COST" color={A.gold}>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                <span style={{ fontFamily:"monospace", fontSize:14, color:T[th].dim }}>$</span>
                <input type="number" value={p.cost} onChange={e=>up("cost",Number(e.target.value))}
                  style={{ background:T[th].input, border:`1px solid ${T[th].inputBorder}`, borderRadius:5, color:T[th].text, padding:"6px 10px", fontSize:16, fontFamily:"monospace", fontWeight:700, outline:"none", width:180 }} />
                <span style={{ fontFamily:"monospace", fontSize:11, color:T[th].mute }}>USD</span>
              </div>
              {p.cost>0 && <div style={{ fontFamily:"monospace", fontSize:11, color:A.gold, background:`${A.gold}0A`, border:`1px solid ${A.gold}30`, borderRadius:5, padding:"7px 10px" }}>Budget approval required from PM before work begins</div>}
              {p.cost===0 && <div style={{ fontFamily:"monospace", fontSize:11, color:T[th].mute }}>No additional budget required — existing staff labor only</div>}
            </SectionCard>
            <div><Label>RESOURCES REQUIRED</Label>
              <TA value={p.resources} onChange={v=>up("resources",v)} rows={4}
                placeholder="List all resources — personnel hours, tool licenses, hardware, external contractors, ongoing operational costs..." />
            </div>
            <SectionCard title="COST APPROVAL THRESHOLDS" color={T[th].mute}>
              {[["$0","No approval — labor only",A.green],["$1 – $9,999","ISSO + ISSM approval",A.teal],["$10,000 – $49,999","PM approval required",A.gold],["$50,000+","PM + AO + contracting action",A.red]].map(([range,label,c],i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${T[th].border}` }}>
                  <span style={{ fontFamily:"monospace", fontSize:10, color:T[th].dim }}>{range}</span>
                  <span style={{ fontFamily:"monospace", fontSize:10, color:c }}>{label}</span>
                </div>
              ))}
            </SectionCard>
          </div>
        )}
        {tab==="comments" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div><Label>COMMENTS FOR SCA / ISSM REVIEW</Label>
              <TA value={p.comments} onChange={v=>up("comments",v)} rows={5}
                placeholder="Status updates, clarifications, risk acceptance rationale, coordination notes, anything the SCA or ISSM needs to know..." />
            </div>
            <SectionCard title="COMMENT GUIDANCE BY AUDIENCE" color={T[th].mute}>
              {[["SCA","Note available evidence, testing approach, why finding exists, and current remediation status."],["ISSM","Escalations, resource needs, milestone changes, anything requiring coordination or approval."],["AO","Risk impact, residual risk, business justification for risk acceptance if applicable."],["PM","Budget needs, schedule impacts, vendor coordination, contract actions required."]].map(([aud,g],i)=>(
                <div key={i} style={{ marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${T[th].border}` }}>
                  <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:A.teal, marginBottom:3 }}>{aud}</div>
                  <div style={{ fontSize:10, color:T[th].dim, lineHeight:1.6 }}>{g}</div>
                </div>
              ))}
            </SectionCard>
            <div style={{ fontFamily:"monospace", fontSize:11, color:T[th].mute }}>Last updated: {p.updated} · Created: {p.created}</div>
          </div>
        )}
      </div>
    </div>
  );
}
// ── Main ──────────────────────────────────────────────────────────────────────
export default function POAMTracker() {
  const C = useColors();
  const [theme, setTheme] = useState("dark");
  const [poams, setPoams] = useState(POAMS_INIT);
  const [sel, setSel] = useState(null);
  const [fStatus, setFStatus] = useState("ALL");
  const [fSev, setFSev] = useState("ALL");
  const [fOwner, setFOwner] = useState("ALL");
  const [search, setSearch] = useState("");
  const { systemId } = useAuth();
  const [loaded, setLoaded] = useState(false);
  // ── Load from Supabase on mount ──────────────────────────────
  useEffect(() => {
    loadPoamItems(systemId).then(items => {
      if (items && items.length > 0) {
        const remote = items.map(r => r.raw || r).filter(r => r && r.id);
        setPoams(remote);
      }
      setLoaded(true);
    });
  }, [systemId]);
  // ── Save individual POAM items — only after initial load ─────
  // Called explicitly when user adds/edits, not on every render
  const saveSinglePoam = useCallback((item) => {
    if (!loaded) return;
    savePoamItem(item, systemId).catch(e => console.error("POAM save error:", e));
  }, [loaded, systemId]);
  const t = T[theme];
  const update = (u) => { setPoams(prev=>prev.map(p=>p.id===u.id?u:p)); setSel(u); saveSinglePoam(u); };
  const addNew = () => {
    const n = { id:`POAM-${String(Date.now()).slice(-6)}`, control:"", cat:"II", severity:"M", weakness:"", source:"", cve:"", poc:"ISSO", action_owners:["ISSO"], cost:0, resources:"", scheduled_completion:"", milestones:[], milestone_changes:"", status:"Ongoing", comments:"", system:"", created:new Date().toISOString().split("T")[0], updated:new Date().toISOString().split("T")[0] };
    saveSinglePoam(n);
    setPoams(prev=>[n,...prev]); setSel(n);
  };
  const visible = useMemo(()=>poams
    .filter(p=>fStatus==="ALL"||p.status===fStatus)
    .filter(p=>fSev==="ALL"||p.severity===fSev)
    .filter(p=>fOwner==="ALL"||p.poc===fOwner||p.action_owners.includes(fOwner))
    .filter(p=>!search||p.weakness.toLowerCase().includes(search.toLowerCase())||p.control.toLowerCase().includes(search.toLowerCase())||p.id.toLowerCase().includes(search.toLowerCase()))
  ,[poams,fStatus,fSev,fOwner,search]);
  const kpi = useMemo(()=>({
    total:poams.length, catI:poams.filter(p=>p.cat==="I"&&p.status==="Ongoing").length,
    high:poams.filter(p=>p.severity==="H"&&p.status==="Ongoing").length,
    delayed:poams.filter(p=>p.status==="Delayed").length,
    remediated:poams.filter(p=>p.status==="Remediated").length,
    cost:poams.reduce((s,p)=>s+p.cost,0),
  }),[poams]);
  const score = Math.round(((kpi.remediated+poams.filter(p=>p.status==="Risk Accepted"||p.status==="Closed").length)/poams.length)*100);
  const sc = score>=80?A.green:score>=60?A.teal:score>=40?A.orange:A.red;
  const circ = 2*Math.PI*32;
  return (
          <div style={{ minHeight:"100vh", background:t.bg, color:t.text, fontFamily:"'Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column" }}>
        <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${t.bg}}::-webkit-scrollbar-thumb{background:${t.scroll};border-radius:2px}`}</style>
        {/* Header */}
        <div style={{ background:theme==="dark"?C.headerBg:t.white, borderBottom:`1px solid ${t.border}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:100 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg,${A.teal},${A.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontSize:14, fontWeight:900, color:C.panelAlt }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:t.white }}>SentinelGRC — POAM Tracker</div>
            <div style={{ fontFamily:"monospace", fontSize:10, color:t.mute, letterSpacing:0.8 }}>eMASS-ALIGNED · CONTINUOUS MONITORING · cATO</div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center" }}>
            {/* Theme toggle */}
            <div style={{ background:t.panel, border:`1px solid ${t.border}`, borderRadius:20, padding:"3px 5px", display:"flex", gap:2 }}>
              {["dark","light"].map(m=>(
                <button key={m} onClick={()=>setTheme(m)}
                  style={{ background:theme===m?A.teal:"transparent", border:"none", borderRadius:16, padding:"4px 11px", cursor:"pointer", fontFamily:"monospace", fontSize:11, fontWeight:700, color:theme===m?C.headerBg:t.mute, transition:"all 0.2s" }}>
                  {m==="dark"?"🌙 DARK":"☀ LIGHT"}
                </button>
              ))}
            </div>
            <button onClick={addNew} style={{ fontFamily:"monospace", background:A.teal, border:"none", color:C.headerBg, borderRadius:5, padding:"7px 14px", cursor:"pointer", fontSize:10, fontWeight:700 }}>+ NEW POAM</button>
            <button style={{ fontFamily:"monospace", background:"transparent", border:`1px solid ${t.border}`, color:t.dim, borderRadius:5, padding:"7px 12px", cursor:"pointer", fontSize:10 }}>↓ eMASS EXPORT</button>
          </div>
        </div>
        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"76px repeat(6,1fr)", gap:8, padding:"12px 20px", borderBottom:`1px solid ${t.border}`, background:t.panel2 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <svg width={68} height={68} viewBox="0 0 68 68">
              <circle cx={34} cy={34} r={32} fill="none" stroke={theme==="dark"?C.border:"#D8E4F0"} strokeWidth={6}/>
              <circle cx={34} cy={34} r={32} fill="none" stroke={sc} strokeWidth={6} strokeDasharray={circ} strokeDashoffset={circ-(score/100)*circ} strokeLinecap="round" transform="rotate(-90 34 34)"/>
              <text x={34} y={38} textAnchor="middle" fill={sc} fontSize={13} fontWeight={800} fontFamily="monospace">{score}%</text>
            </svg>
            <div style={{ fontFamily:"monospace", fontSize:9, color:t.mute, letterSpacing:1, marginTop:2 }}>ATO POSTURE</div>
          </div>
          {[[kpi.total,"Total POAMs",t.text],[kpi.catI,"CAT I Open",kpi.catI>0?A.red:A.green],[kpi.high,"High Severity",kpi.high>0?A.orange:A.green],[kpi.delayed,"Delayed",kpi.delayed>0?A.red:A.green],[kpi.remediated,"Remediated",A.green],[`$${kpi.cost.toLocaleString()}`,"Total Cost",A.gold]].map(([v,l,c],i)=>(
            <div key={i} style={{ background:t.panel, border:`1px solid ${t.border}`, borderRadius:7, padding:"9px 12px" }}>
              <div style={{ fontFamily:"monospace", fontSize:20, fontWeight:800, color:c, lineHeight:1 }}>{v}</div>
              <div style={{ fontFamily:"monospace", fontSize:10, color:t.mute, letterSpacing:1, marginTop:4, textTransform:"uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
        {/* Body */}
        <div style={{ flex:1, display:"flex", overflow:"hidden", height:"calc(100vh - 168px)" }}>
          {/* List */}
          <div style={{ flex:sel?0.44:1, display:"flex", flexDirection:"column", overflow:"hidden", borderRight:sel?`1px solid ${t.border}`:"none" }}>
            {/* Filters */}
            <div style={{ padding:"9px 14px", borderBottom:`1px solid ${t.border}`, display:"flex", gap:7, flexWrap:"wrap", background:t.panel2 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search POAM ID, control, weakness..."
                style={{ background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:5, color:t.text, padding:"5px 10px", fontSize:11, outline:"none", flex:1, minWidth:160 }} />
              <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{ background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:5, color:t.text, padding:"5px 8px", fontSize:10, fontFamily:"monospace", outline:"none", cursor:"pointer" }}>
                <option value="ALL">All Status</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
              <select value={fSev} onChange={e=>setFSev(e.target.value)} style={{ background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:5, color:t.text, padding:"5px 8px", fontSize:10, fontFamily:"monospace", outline:"none", cursor:"pointer" }}>
                <option value="ALL">All Severity</option><option value="H">High (H)</option><option value="M">Medium (M)</option><option value="L">Low (L)</option>
              </select>
              <select value={fOwner} onChange={e=>setFOwner(e.target.value)} style={{ background:t.input, border:`1px solid ${t.inputBorder}`, borderRadius:5, color:t.text, padding:"5px 8px", fontSize:10, fontFamily:"monospace", outline:"none", cursor:"pointer" }}>
                <option value="ALL">All Owners</option>{ROLES.map(r=><option key={r} value={r}>POC: {r}</option>)}
              </select>
              <span style={{ fontFamily:"monospace", fontSize:11, color:t.mute, alignSelf:"center" }}>{visible.length} items</span>
            </div>
            {/* Table header */}
            <div style={{ display:"grid", gridTemplateColumns:"90px 65px 42px 42px 1fr 55px 65px 70px", gap:0, padding:"6px 12px", borderBottom:`1px solid ${t.border}`, background:t.panel2 }}>
              {["POAM ID","CONTROL","CAT","SEV","WEAKNESS","POC","STATUS","COMPLETION"].map(h=>(
                <div key={h} style={{ fontFamily:"monospace", fontSize:9, color:t.mute, letterSpacing:1.2 }}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            <div style={{ flex:1, overflowY:"auto" }}>
              {visible.map((p,i)=>{
                const isSel=sel?.id===p.id;
                return (
                  <div key={p.id} onClick={()=>setSel(isSel?null:p)}
                    style={{ display:"grid", gridTemplateColumns:"90px 65px 42px 42px 1fr 55px 65px 70px", gap:0, padding:"9px 12px", borderBottom:`1px solid ${t.border}`, cursor:"pointer", background:isSel?`${A.teal}0A`:i%2===0?t.rowA:t.rowB, borderLeft:isSel?`3px solid ${A.teal}`:"3px solid transparent" }}>
                    <div style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:A.teal }}>{p.id}</div>
                    <div style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:A.blue }}>{p.control}</div>
                    <div><Badge label={`C${p.cat}`} color={CAT_C[p.cat]||A.orange} sm /></div>
                    <div><Badge label={SEV[p.severity]?.l||"Med"} color={SEV[p.severity]?.c||A.gold} sm /></div>
                    <div style={{ fontSize:11, color:t.dim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:8 }}>{p.weakness}</div>
                    <div style={{ fontFamily:"monospace", fontSize:10, color:t.dim }}>{p.poc}</div>
                    <div style={{ fontFamily:"monospace", fontSize:11, color:p.status==="Remediated"?A.green:p.status==="Delayed"?A.red:p.status==="Risk Accepted"?A.purple:A.orange, overflow:"hidden", textOverflow:"ellipsis" }}>{p.status}</div>
                    <div style={{ fontFamily:"monospace", fontSize:11, color:t.mute, overflow:"hidden", textOverflow:"ellipsis" }}>{p.scheduled_completion||"—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Detail */}
          {sel && (
            <div style={{ flex:0.56, overflow:"hidden", padding:12 }}>
              <Detail poam={sel} onUpdate={update} onClose={()=>setSel(null)} />
            </div>
          )}
        </div>
      </div>
      );
}