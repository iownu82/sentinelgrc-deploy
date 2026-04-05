import { useState, useRef, useMemo, useCallback } from "react";
import { useColors } from "../theme.js";
import { useColors, useTheme } from "../theme.js";

const C = { bg:"#03080E", panel:"#060D16", panelAlt:"#08111C", panel2:"#08111C", border:"#0D1E2E", borderMd:"#152840", text:"#C8D8E8", textDim:"#7A9AB8", dim:"#7A9AB8", textMute:"#3A5570", mute:"#3A5570", white:"#F0F8FF", input:"#040C16", inputBorder:"#1A3A5C", rowA:"#050C14", rowB:"#040A12", scroll:"#1A3A5C", headerBg:"#02060C", teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444", orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF" };

// ── Severity mappings ─────────────────────────────────────────────────────
// Nessus severity int → label
const NESSUS_SEV = { 0:"Info", 1:"Low", 2:"Medium", 3:"High", 4:"Critical" };
// DoD CAT mapping — prefer stig_severity field, fallback to CVSS/severity int
function getDoD_CAT(stigSev, nessus_sev_int, cvss3, cvss2) {
  if (stigSev === "I"  || stigSev === "1") return "I";
  if (stigSev === "II" || stigSev === "2") return "II";
  if (stigSev === "III"|| stigSev === "3") return "III";
  // Fallback: use CVSS3 > CVSS2 > nessus severity int
  const score = parseFloat(cvss3 || cvss2 || "0");
  if (score >= 7.0 || nessus_sev_int >= 3) return "I";
  if (score >= 4.0 || nessus_sev_int === 2) return "II";
  if (score > 0    || nessus_sev_int === 1) return "III";
  return null; // Info — no CAT
}
// NIST 800-53 control family suggestions by plugin family
const FAMILY_TO_CONTROL = {
  "Windows":           ["CM-6","SI-2","CM-7"],
  "General":           ["SI-2","RA-5","CM-6"],
  "Service detection": ["CM-7","SC-7"],
  "Web Servers":       ["SC-8","SI-2","CM-7"],
  "DNS":               ["SC-20","SC-21","CM-7"],
  "Firewalls":         ["SC-7","CM-6","AC-4"],
  "SMTP problems":     ["SI-8","CM-7"],
  "Misc.":             ["SI-2","CM-6"],
  "Databases":         ["AC-3","SC-28","SI-2"],
  "FTP":               ["CM-7","AC-17"],
  "SSH":               ["SC-8","IA-2","CM-6"],
  "Gain a shell remotely": ["SC-7","AC-6","SI-2"],
  "Credentials":       ["IA-5","AC-2","SC-28"],
  "Patch management":  ["SI-2","RA-5","CM-6"],
  "Settings":          ["CM-6","CM-7","AC-3"],
  "Policy Compliance": ["CM-6","CM-2","SI-2"],
  "CGI abuses":        ["SI-10","SI-2","SC-7"],
  "Netware":           ["CM-7","AC-17"],
  "RPC":               ["CM-7","SC-7"],
  "SNMP":              ["CM-6","SC-8","IA-3"],
  "Backdoors":         ["SI-3","IR-4","SC-7"],
};
function suggestControls(pluginFamily) {
  return FAMILY_TO_CONTROL[pluginFamily] || ["SI-2","RA-5","CM-6"];
}
// ── XML Parser ────────────────────────────────────────────────────────────
function parseNessusFile(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("Invalid XML — not a valid .nessus file");
  const root = doc.querySelector("NessusClientData_v2");
  if (!root) throw new Error("Not a valid .nessus file — missing NessusClientData_v2 root element");
  const reportName = doc.querySelector("Report")?.getAttribute("name") || "Unknown Scan";
  const findings = [];
  const hosts = [];
  const reportHosts = doc.querySelectorAll("ReportHost");
  reportHosts.forEach(host => {
    const hostName = host.getAttribute("name") || "Unknown";
    // Host properties
    const props = {};
    host.querySelectorAll("HostProperties tag").forEach(tag => {
      props[tag.getAttribute("name")] = tag.textContent;
    });
    const hostInfo = {
      name: hostName,
      ip: props["host-ip"] || hostName,
      fqdn: props["host-fqdn"] || "",
      os: props["operating-system"] || props["os"] || "",
      netbios: props["netbios-name"] || "",
      mac: props["mac-address"] || "",
      startTime: props["HOST_START"] || "",
      endTime: props["HOST_END"] || "",
      credentialed: props["Credentialed_Scan"] === "true" || props["credentialed_scan"] === "true",
    };
    hosts.push(hostInfo);
    // ReportItems
    host.querySelectorAll("ReportItem").forEach(item => {
      const pluginID   = item.getAttribute("pluginID") || "";
      const pluginName = item.getAttribute("pluginName") || "";
      const pluginFamily = item.getAttribute("pluginFamily") || "";
      const sevInt     = parseInt(item.getAttribute("severity") || "0", 10);
      const port       = item.getAttribute("port") || "0";
      const protocol   = item.getAttribute("protocol") || "";
      const svcName    = item.getAttribute("svc_name") || "";
      // Skip severity 0 (informational) unless it has a stig_severity
      const stigSev    = item.querySelector("stig_severity")?.textContent?.trim() || "";
      if (sevInt === 0 && !stigSev) return;
      const cvss3      = item.querySelector("cvss3_base_score")?.textContent?.trim() || "";
      const cvss2      = item.querySelector("cvss_base_score")?.textContent?.trim() || "";
      const cvss3Vec   = item.querySelector("cvss3_vector")?.textContent?.trim() || "";
      const synopsis   = item.querySelector("synopsis")?.textContent?.trim() || "";
      const description= item.querySelector("description")?.textContent?.trim() || "";
      const solution   = item.querySelector("solution")?.textContent?.trim() || "";
      const riskFactor = item.querySelector("risk_factor")?.textContent?.trim() || "";
      const pluginOutput = item.querySelector("plugin_output")?.textContent?.trim() || "";
      const cve        = [...item.querySelectorAll("cve")].map(c => c.textContent.trim()).join(", ");
      const bid        = item.querySelector("bid")?.textContent?.trim() || "";
      const exploitAvail = item.querySelector("exploit_available")?.textContent?.trim() === "true";
      const exploitEase  = item.querySelector("exploitability_ease")?.textContent?.trim() || "";
      const patchDate    = item.querySelector("patch_publication_date")?.textContent?.trim() || "";
      const inNews       = item.querySelector("in_the_news")?.textContent?.trim() === "true";
      const metasploit   = item.querySelector("exploit_framework_metasploit")?.textContent?.trim() === "true";
      const seeAlso    = item.querySelector("see_also")?.textContent?.trim() || "";
      const dodCat = getDoD_CAT(stigSev, sevInt, cvss3, cvss2);
      findings.push({
        id: `${pluginID}-${hostName}-${port}`,
        pluginID,
        pluginName,
        pluginFamily,
        host: hostInfo,
        port,
        protocol,
        svcName,
        sevInt,
        sevLabel: NESSUS_SEV[sevInt] || "Info",
        dodCat,
        stigSev,
        cvss3: cvss3 ? parseFloat(cvss3) : null,
        cvss2: cvss2 ? parseFloat(cvss2) : null,
        cvss3Vec,
        synopsis,
        description,
        solution,
        riskFactor,
        pluginOutput: pluginOutput.slice(0, 500) + (pluginOutput.length > 500 ? "..." : ""),
        cve,
        bid,
        exploitAvail,
        exploitEase,
        metasploit,
        patchDate,
        inNews,
        seeAlso,
        suggestedControls: suggestControls(pluginFamily),
        addedToPoam: false,
      });
    });
  });
  // Sort: CAT I first, then by CVSS desc
  findings.sort((a, b) => {
    const catOrder = {"I":0,"II":1,"III":2,null:3};
    const co = (catOrder[a.dodCat]??3) - (catOrder[b.dodCat]??3);
    if (co !== 0) return co;
    return (b.cvss3 || b.cvss2 || 0) - (a.cvss3 || a.cvss2 || 0);
  });
  return { reportName, hosts, findings };
}
// ── Sample .nessus XML for demo ───────────────────────────────────────────
const SAMPLE_NESSUS = `<?xml version="1.0" ?>
<NessusClientData_v2>
<Report name="SentinelGRC Demo Scan - F35 Enclave" xmlns:cm="http://www.nessus.org/cm">
<ReportHost name="10.1.10.50">
<HostProperties>
<tag name="host-ip">10.1.10.50</tag>
<tag name="operating-system">Microsoft Windows Server 2019 Standard</tag>
<tag name="netbios-name">SRV-APP-01</tag>
<tag name="Credentialed_Scan">true</tag>
<tag name="HOST_START">Mon Mar 10 09:00:00 2025</tag>
<tag name="HOST_END">Mon Mar 10 09:15:00 2025</tag>
</HostProperties>
<ReportItem port="445" svc_name="cifs" protocol="tcp" severity="4" pluginID="97833" pluginName="MS17-010: Security Update for Windows SMB Server (WannaCry)" pluginFamily="Windows">
<synopsis>The remote Windows host is affected by multiple critical vulnerabilities.</synopsis>
<description>The remote Windows host is missing a security update. It is affected by multiple remote code execution vulnerabilities in Microsoft Server Message Block 1.0 (SMBv1) due to improper handling of certain requests. A remote attacker can exploit these vulnerabilities to execute arbitrary code on the target host.</description>
<solution>Microsoft has released a set of patches for Windows Vista, 2008, 7, 2008 R2, 2012, 8.1, RT 8.1, 2012 R2, 10, and 2016. Apply the patches immediately.</solution>
<risk_factor>Critical</risk_factor>
<cve>CVE-2017-0143</cve><cve>CVE-2017-0144</cve><cve>CVE-2017-0145</cve>
<cvss3_base_score>9.8</cvss3_base_score>
<cvss3_vector>CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H</cvss3_vector>
<stig_severity>I</stig_severity>
<exploit_available>true</exploit_available>
<exploitability_ease>Exploits are available</exploitability_ease>
<exploit_framework_metasploit>true</exploit_framework_metasploit>
<in_the_news>true</in_the_news>
<patch_publication_date>2017/03/14</patch_publication_date>
<plugin_output>Vulnerable: SMBv1 is enabled on the remote host. The host has not applied MS17-010.</plugin_output>
</ReportItem>
<ReportItem port="3389" svc_name="msrdp" protocol="tcp" severity="3" pluginID="58453" pluginName="Microsoft Remote Desktop Protocol Server Man-in-the-Middle Weakness" pluginFamily="Windows">
<synopsis>It is possible to get information about the remote host RDP certificate.</synopsis>
<description>The remote Terminal Services / Remote Desktop Services service is using a self-signed certificate. It is possible for a man-in-the-middle attacker to intercept the remote session without the user being aware.</description>
<solution>Configure the Remote Desktop Services to use a valid certificate signed by a trusted CA. This requires setting up a PKI infrastructure and configuring RDP to use PKI certificates.</solution>
<risk_factor>High</risk_factor>
<cve>CVE-2005-1794</cve>
<cvss3_base_score>7.4</cvss3_base_score>
<stig_severity>II</stig_severity>
<exploit_available>false</exploit_available>
<patch_publication_date>2005/06/14</patch_publication_date>
<plugin_output>Remote Desktop Certificate: Subject: CN=SRV-APP-01. Issuer: CN=SRV-APP-01 (self-signed)</plugin_output>
</ReportItem>
<ReportItem port="0" svc_name="general" protocol="tcp" severity="2" pluginID="57608" pluginName="SMB Signing Required" pluginFamily="Windows">
<synopsis>Signing is not required on the remote SMB server.</synopsis>
<description>Signing is not required on the remote SMB server. An unauthenticated, remote attacker can exploit this to conduct man-in-the-middle attacks against the SMB server.</description>
<solution>Enforce message signing in the host's configuration. On Windows, this is found in the Group Policy settings. Workstation Configuration: Microsoft network client: Digitally sign communications (always).</solution>
<risk_factor>Medium</risk_factor>
<cvss3_base_score>5.3</cvss3_base_score>
<stig_severity>II</stig_severity>
<exploit_available>false</exploit_available>
<plugin_output>The remote SMB server does not require signing. Authenticated scan confirmed unsigned SMB.</plugin_output>
</ReportItem>
<ReportItem port="445" svc_name="cifs" protocol="tcp" severity="1" pluginID="26919" pluginName="Microsoft Windows SMB NULL Session Authentication" pluginFamily="Windows">
<synopsis>It is possible to log into the remote host with a NULL session.</synopsis>
<description>The remote host is running Microsoft Windows. It was possible to log into it using a NULL session (i.e., with no login or password). Depending on the configuration, it may be possible for a remote attacker to get valuable information about the host.</description>
<solution>Apply the patches from Microsoft and restrict anonymous access via Group Policy.</solution>
<risk_factor>Low</risk_factor>
<cvss3_base_score>2.6</cvss3_base_score>
<stig_severity>III</stig_severity>
<exploit_available>false</exploit_available>
<plugin_output>NULL session successful on IPC$ share.</plugin_output>
</ReportItem>
</ReportHost>
<ReportHost name="10.1.10.51">
<HostProperties>
<tag name="host-ip">10.1.10.51</tag>
<tag name="operating-system">Red Hat Enterprise Linux 8.6</tag>
<tag name="netbios-name">SRV-WEB-01</tag>
<tag name="Credentialed_Scan">true</tag>
<tag name="HOST_START">Mon Mar 10 09:15:00 2025</tag>
<tag name="HOST_END">Mon Mar 10 09:25:00 2025</tag>
</HostProperties>
<ReportItem port="443" svc_name="https" protocol="tcp" severity="3" pluginID="104743" pluginName="OpenSSL 1.0.2 &lt; 1.0.2u Multiple Vulnerabilities" pluginFamily="General">
<synopsis>The remote service uses an SSL/TLS library that is affected by multiple vulnerabilities.</synopsis>
<description>According to its banner, the remote service is using a version of OpenSSL prior to 1.0.2u. It is, therefore, affected by multiple vulnerabilities including a timing side-channel attack and a padding oracle vulnerability.</description>
<solution>Upgrade OpenSSL to version 1.0.2u or later or apply the vendor-provided patch.</solution>
<risk_factor>High</risk_factor>
<cve>CVE-2019-1551</cve>
<cvss3_base_score>7.5</cvss3_base_score>
<stig_severity>I</stig_severity>
<exploit_available>false</exploit_available>
<patch_publication_date>2019/12/06</patch_publication_date>
<plugin_output>OpenSSL version detected: 1.0.2k-fips. Required: 1.0.2u or later.</plugin_output>
</ReportItem>
<ReportItem port="22" svc_name="ssh" protocol="tcp" severity="2" pluginID="70658" pluginName="SSH Server CBC Mode Ciphers Enabled" pluginFamily="SSH">
<synopsis>The SSH server is configured to support Cipher Block Chaining encryption.</synopsis>
<description>The SSH server is configured to support Cipher Block Chaining (CBC) encryption. This may allow an attacker to recover the plaintext message from the ciphertext through a padding oracle attack.</description>
<solution>Contact the vendor or consult product documentation to disable CBC mode cipher suites. Enforce only CTR or GCM mode ciphers in sshd_config.</solution>
<risk_factor>Medium</risk_factor>
<cvss3_base_score>5.3</cvss3_base_score>
<stig_severity>II</stig_severity>
<exploit_available>false</exploit_available>
<plugin_output>Supported CBC ciphers: aes128-cbc, aes192-cbc, aes256-cbc, 3des-cbc</plugin_output>
</ReportItem>
<ReportItem port="80" svc_name="http" protocol="tcp" severity="2" pluginID="48204" pluginName="Apache HTTP Server &lt; 2.4.49 mod_proxy Flaw" pluginFamily="Web Servers">
<synopsis>The remote web server may be affected by a reverse proxy flaw.</synopsis>
<description>According to its banner, the version of Apache HTTP Server running on the remote host is affected by a flaw in mod_proxy. A remote, unauthenticated attacker could exploit this to conduct server-side request forgery (SSRF) attacks.</description>
<solution>Upgrade to Apache HTTP Server version 2.4.49 or later or apply the patch provided by the vendor.</solution>
<risk_factor>Medium</risk_factor>
<cve>CVE-2021-40438</cve>
<cvss3_base_score>6.8</cvss3_base_score>
<stig_severity>II</stig_severity>
<exploit_available>true</exploit_available>
<exploitability_ease>Exploits are available</exploitability_ease>
<patch_publication_date>2021/09/16</patch_publication_date>
<plugin_output>Apache version detected: 2.4.46. Required: 2.4.49 or later.</plugin_output>
</ReportItem>
</ReportHost>
</Report>
</NessusClientData_v2>`;
// ── Sub-components ────────────────────────────────────────────────────────
function CATBadge({ cat, C }) {
  if (!cat) return null;
  const colors = { I:C.red, II:C.orange, III:C.gold };
  const col = colors[cat] || C.textMute;
  return (
    <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:col, background:`${col}18`, border:`1px solid ${col}40`, borderRadius:3, padding:"2px 8px", whiteSpace:"nowrap" }}>
      CAT {cat}
    </span>
  );
}
function SevBadge({ sev, C }) {
  const colors = { Critical:C.red, High:C.orange, Medium:C.gold, Low:C.blue, Info:C.textMute };
  const col = colors[sev] || C.textMute;
  return (
    <span style={{ fontFamily:"monospace", fontSize:10, color:col, background:`${col}10`, border:`1px solid ${col}30`, borderRadius:3, padding:"2px 8px", whiteSpace:"nowrap" }}>
      {sev}
    </span>
  );
}
// ── Main component ────────────────────────────────────────────────────────
export default function NessusImporter() {
  const C = useColors();
  const theme = useTheme();
  const mono = { fontFamily:"'Courier New',monospace" };
  const fileRef = useRef(null);
  const [scanData, setScanData]     = useState(null);
  const [error, setError]           = useState(null);
  const [dragging, setDragging]     = useState(false);
  const [parsing, setParsing]       = useState(false);
  const [selected, setSelected]     = useState(null);
  const [poamItems, setPoamItems]   = useState([]);
  const [filterCat, setFilterCat]   = useState("ALL");
  const [filterHost, setFilterHost] = useState("ALL");
  const [filterExploit, setFilterExploit] = useState(false);
  const [search, setSearch]         = useState("");
  const [activeTab, setActiveTab]   = useState("findings"); // findings | hosts | poam | export
  const loadFile = useCallback((text, filename) => {
    setParsing(true);
    setError(null);
    try {
      const result = parseNessusFile(text);
      setScanData({ ...result, filename, loadedAt: new Date().toISOString() });
      setActiveTab("findings");
      setSelected(null);
      setPoamItems([]);
    } catch (e) {
      setError(e.message);
    }
    setParsing(false);
  }, []);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith(".nessus")) {
      setError("File must be a .nessus file (Nessus XML v2 format). Export from Nessus as .nessus, not CSV or HTML.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => loadFile(ev.target.result, file.name);
    reader.readAsText(file);
  };
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadFile(ev.target.result, file.name);
    reader.readAsText(file);
  };
  const loadDemo = () => loadFile(SAMPLE_NESSUS, "SentinelGRC_Demo_Scan.nessus");
  const addToPoam = useCallback((finding) => {
    if (poamItems.find(p => p.id === finding.id)) return;
    setPoamItems(prev => [...prev, {
      ...finding,
      poamId: `POAM-${String(prev.length + 1).padStart(3,"0")}`,
      weakness: finding.synopsis,
      resources: "System Administrator",
      scheduledCompletion: new Date(Date.now() + (finding.dodCat==="I"?30:finding.dodCat==="II"?90:180)*86400000).toISOString().split("T")[0],
      status: "Ongoing",
      milestones: finding.dodCat==="I"?"Apply vendor patch within 30 days":"Apply vendor patch within scheduled maintenance window",
    }]);
  }, [poamItems]);
  // Filtered findings
  const findings = useMemo(() => {
    if (!scanData) return [];
    return scanData.findings
      .filter(f => filterCat === "ALL" || f.dodCat === filterCat)
      .filter(f => filterHost === "ALL" || f.host.ip === filterHost)
      .filter(f => !filterExploit || f.exploitAvail)
      .filter(f => !search ||
        f.pluginName.toLowerCase().includes(search.toLowerCase()) ||
        f.synopsis.toLowerCase().includes(search.toLowerCase()) ||
        f.cve.toLowerCase().includes(search.toLowerCase()) ||
        f.pluginID.includes(search));
  }, [scanData, filterCat, filterHost, filterExploit, search]);
  // KPIs
  const kpis = useMemo(() => {
    if (!scanData) return null;
    const f = scanData.findings;
    return {
      total: f.length,
      catI: f.filter(x=>x.dodCat==="I").length,
      catII: f.filter(x=>x.dodCat==="II").length,
      catIII: f.filter(x=>x.dodCat==="III").length,
      exploitable: f.filter(x=>x.exploitAvail).length,
      hosts: scanData.hosts.length,
      credentialed: scanData.hosts.filter(h=>h.credentialed).length,
    };
  }, [scanData]);
  // Export POAM as CSV
  const exportPoam = () => {
    if (!poamItems.length) return;
    const headers = ["POAM ID","Plugin ID","Plugin Name","Host","Port","CAT","CVSS Score","CVE","Weakness/Finding","Recommended Remediation","Responsible Party","Scheduled Completion","Status","Milestones"];
    const rows = poamItems.map(p => [
      p.poamId, p.pluginID, `"${p.pluginName}"`, p.host.ip, p.port, `CAT ${p.dodCat}`,
      p.cvss3||p.cvss2||"", p.cve, `"${p.synopsis}"`, `"${p.solution}"`,
      p.resources, p.scheduledCompletion, p.status, `"${p.milestones}"`,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="POAM_from_nessus.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const catColor = { I:C.red, II:C.orange, III:C.gold };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column",
      filter:theme==="light"?"invert(1) hue-rotate(180deg) saturate(0.7) brightness(1.05)":"none" }}>
      <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.scroll||C.inputBorder};border-radius:2px}`}</style>
      {/* Header */}
      <div style={{ background:C.headerBg||C.panel, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg,${C.teal},${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:C.bg }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>SentinelGRC — Nessus Scan Importer</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>NESSUS XML v2 · ACAS/TENABLE.SC · DoD CAT I/II/III MAPPING · eMASS POAM EXPORT</div>
          </div>
        </div>
        {kpis && (
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {kpis.catI > 0 && <span style={{ ...mono, fontSize:10, color:C.red, background:`${C.red}14`, border:`1px solid ${C.red}40`, borderRadius:4, padding:"4px 10px" }}>● {kpis.catI} CAT I</span>}
            {kpis.catII > 0 && <span style={{ ...mono, fontSize:10, color:C.orange, background:`${C.orange}14`, border:`1px solid ${C.orange}40`, borderRadius:4, padding:"4px 10px" }}>● {kpis.catII} CAT II</span>}
            {poamItems.length > 0 && <span style={{ ...mono, fontSize:10, color:C.teal, background:`${C.teal}14`, border:`1px solid ${C.teal}40`, borderRadius:4, padding:"4px 10px" }}>📋 {poamItems.length} POAM items</span>}
          </div>
        )}
      </div>
      {/* Drop zone (when no file loaded) */}
      {!scanData && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40 }}>
          {error && (
            <div style={{ background:`${C.red}0A`, border:`1px solid ${C.red}30`, borderRadius:8, padding:"12px 20px", marginBottom:16, maxWidth:600, width:"100%", ...mono, fontSize:11, color:C.red }}>
              ❌ {error}
            </div>
          )}
          <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop}
            onClick={()=>fileRef.current?.click()}
            style={{ background:dragging?`${C.teal}07`:C.panel, border:`2px dashed ${dragging?C.teal:C.border}`, borderRadius:12, padding:"50px 60px", textAlign:"center", cursor:"pointer", maxWidth:560, width:"100%", transition:"all 0.2s", marginBottom:20 }}>
            <input type="file" ref={fileRef} accept=".nessus" onChange={handleFileSelect} style={{ display:"none" }} />
            <div style={{ fontSize:48, marginBottom:14 }}>📄</div>
            <div style={{ fontSize:15, fontWeight:700, color:dragging?C.teal:C.white, marginBottom:8 }}>
              {dragging ? "Release to import scan" : "Drop your .nessus file here"}
            </div>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>or click to browse</div>
            <div style={{ ...mono, fontSize:11, color:C.textMute, marginTop:10 }}>Exports from: Nessus Professional · Nessus Expert · ACAS · Tenable.sc</div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ height:1, width:60, background:C.border }} />
            <span style={{ ...mono, fontSize:11, color:C.textMute }}>or</span>
            <div style={{ height:1, width:60, background:C.border }} />
          </div>
          <button onClick={loadDemo} style={{ marginTop:14, ...mono, background:`${C.blue}0F`, border:`1px solid ${C.blue}30`, color:C.blue, borderRadius:6, padding:"10px 24px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            ▶ LOAD DEMO SCAN (F-35 Enclave)
          </button>
          <div style={{ ...mono, fontSize:11, color:C.textMute, marginTop:8 }}>7 findings across 2 hosts · CAT I/II/III · Credentialed scan</div>
        </div>
      )}
      {/* Main content (after file loaded) */}
      {scanData && (
        <>
          {/* Tabs + KPIs */}
          <div style={{ background:C.panel2||C.panel, borderBottom:`1px solid ${C.border}` }}>
            {/* KPI row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8, padding:"10px 20px 0" }}>
              {[
                { l:"Total Findings",  v:kpis.total,        c:C.white  },
                { l:"CAT I",          v:kpis.catI,         c:C.red    },
                { l:"CAT II",         v:kpis.catII,        c:C.orange },
                { l:"CAT III",        v:kpis.catIII,       c:C.gold   },
                { l:"Exploitable",    v:kpis.exploitable,  c:kpis.exploitable>0?C.red:C.green },
                { l:"Hosts Scanned",  v:kpis.hosts,        c:C.blue   },
                { l:"Credentialed",   v:kpis.credentialed, c:C.teal   },
              ].map(k => (
                <div key={k.l} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px" }}>
                  <div style={{ ...mono, fontSize:22, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</div>
                  <div style={{ ...mono, fontSize:9, color:C.textMute, marginTop:3, textTransform:"uppercase", letterSpacing:0.8 }}>{k.l}</div>
                </div>
              ))}
            </div>
            {/* Tab bar */}
            <div style={{ display:"flex", padding:"0 20px" }}>
              {[["findings","🔍 Findings"],["hosts","🖥 Hosts"],["poam",`📋 POAM (${poamItems.length})`],["export","📤 Export"]].map(([id,label]) => (
                <button key={id} onClick={()=>setActiveTab(id)}
                  style={{ background:"none", border:"none", borderBottom:`2px solid ${activeTab===id?C.teal:"transparent"}`, color:activeTab===id?C.teal:C.textMute, padding:"10px 16px", cursor:"pointer", ...mono, fontSize:11, fontWeight:activeTab===id?700:400 }}>
                  {label}
                </button>
              ))}
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ ...mono, fontSize:11, color:C.textMute }}>
                  📁 {scanData.filename}
                </span>
                <button onClick={()=>{setScanData(null);setError(null);setPoamItems([]);}}
                  style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:4, padding:"4px 10px", cursor:"pointer", fontSize:11 }}>
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
          {/* ── FINDINGS TAB ──────────────────────────────────────────── */}
          {activeTab === "findings" && (
            <div style={{ flex:1, display:"flex", overflow:"hidden", height:"calc(100vh - 200px)" }}>
              {/* Findings list */}
              <div style={{ flex:selected?0.5:1, display:"flex", flexDirection:"column", borderRight:selected?`1px solid ${C.border}`:"none" }}>
                {/* Filter bar */}
                <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, background:C.panel2||C.panel, display:"flex", gap:8, flexWrap:"wrap" }}>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plugin name, CVE, plugin ID..."
                    style={{ flex:1, minWidth:180, background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"5px 10px", fontSize:11, outline:"none" }} />
                  <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
                    style={{ background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"5px 8px", fontSize:11, ...mono, outline:"none", cursor:"pointer" }}>
                    <option value="ALL">All CAT</option>
                    <option value="I">CAT I (Critical/High)</option>
                    <option value="II">CAT II (Medium)</option>
                    <option value="III">CAT III (Low)</option>
                  </select>
                  <select value={filterHost} onChange={e=>setFilterHost(e.target.value)}
                    style={{ background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"5px 8px", fontSize:11, ...mono, outline:"none", cursor:"pointer" }}>
                    <option value="ALL">All Hosts</option>
                    {scanData.hosts.map(h => <option key={h.ip} value={h.ip}>{h.ip} {h.netbios ? `(${h.netbios})` : ""}</option>)}
                  </select>
                  <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", ...mono, fontSize:11, color:filterExploit?C.red:C.textMute }}>
                    <input type="checkbox" checked={filterExploit} onChange={e=>setFilterExploit(e.target.checked)} />
                    Exploitable only
                  </label>
                  <span style={{ ...mono, fontSize:11, color:C.textMute, alignSelf:"center" }}>{findings.length} findings</span>
                </div>
                <div style={{ flex:1, overflowY:"auto" }}>
                  {findings.map(f => {
                    const isSel = selected?.id === f.id;
                    const inPoam = poamItems.find(p=>p.id===f.id);
                    return (
                      <div key={f.id} onClick={()=>setSelected(isSel?null:f)}
                        style={{ padding:"11px 16px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:isSel?`${C.teal}0A`:"transparent", borderLeft:isSel?`3px solid ${C.teal}`:f.dodCat?`3px solid ${catColor[f.dodCat]}40`:"3px solid transparent" }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
                          <CATBadge cat={f.dodCat} C={C} />
                          <SevBadge sev={f.sevLabel} C={C} />
                          {f.cvss3 && <span style={{ ...mono, fontSize:10, color:C.textMute }}>CVSS3: {f.cvss3}</span>}
                          {f.exploitAvail && <span style={{ ...mono, fontSize:9, color:C.red, background:`${C.red}0F`, border:`1px solid ${C.red}25`, borderRadius:3, padding:"1px 6px" }}>⚡ EXPLOIT</span>}
                          {f.metasploit && <span style={{ ...mono, fontSize:9, color:C.purple, background:`${C.purple}0F`, border:`1px solid ${C.purple}25`, borderRadius:3, padding:"1px 6px" }}>MSF</span>}
                          {inPoam && <span style={{ ...mono, fontSize:9, color:C.teal, background:`${C.teal}0F`, border:`1px solid ${C.teal}25`, borderRadius:3, padding:"1px 6px" }}>✓ POAM</span>}
                        </div>
                        <div style={{ fontSize:12, fontWeight:600, color:C.white, marginBottom:3 }}>{f.pluginName}</div>
                        <div style={{ ...mono, fontSize:10, color:C.textMute }}>
                          {f.host.ip}{f.host.netbios?` (${f.host.netbios})`:""} · Port {f.port}/{f.protocol} · Plugin {f.pluginID}
                          {f.cve ? ` · ${f.cve.split(",")[0]}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Finding detail */}
              {selected && (
                <div style={{ flex:0.5, overflowY:"auto", background:C.panel }}>
                  <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.panel, zIndex:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
                          <CATBadge cat={selected.dodCat} C={C} />
                          <SevBadge sev={selected.sevLabel} C={C} />
                          {selected.cvss3 && <span style={{ ...mono, fontWeight:700, fontSize:11, color:catColor[selected.dodCat]||C.textMute }}>CVSS3: {selected.cvss3}</span>}
                          {selected.exploitAvail && <span style={{ ...mono, fontSize:10, color:C.red }}>⚡ Public exploit available</span>}
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.white, lineHeight:1.4, marginBottom:4 }}>{selected.pluginName}</div>
                        <div style={{ ...mono, fontSize:10, color:C.textMute }}>
                          Plugin {selected.pluginID} · {selected.host.ip}{selected.host.netbios?` (${selected.host.netbios})`:""} · Port {selected.port}/{selected.protocol}
                        </div>
                      </div>
                      <button onClick={()=>setSelected(null)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:4, padding:"3px 9px", cursor:"pointer", fontSize:11, marginLeft:10 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ padding:16 }}>
                    {/* Synopsis */}
                    <div style={{ background:`${catColor[selected.dodCat]||C.border}08`, border:`1px solid ${catColor[selected.dodCat]||C.border}25`, borderRadius:7, padding:13, marginBottom:13 }}>
                      <div style={{ ...mono, fontSize:10, color:C.textMute, fontWeight:600, marginBottom:5 }}>SYNOPSIS</div>
                      <div style={{ fontSize:12, color:C.text, lineHeight:1.7 }}>{selected.synopsis}</div>
                    </div>
                    {/* Metadata grid */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:13 }}>
                      {[
                        { l:"Plugin Family",   v:selected.pluginFamily },
                        { l:"Port / Service",  v:`${selected.port}/${selected.protocol} (${selected.svcName||"unknown"})` },
                        { l:"CVE",             v:selected.cve || "—" },
                        { l:"CVSS3 Score",     v:selected.cvss3 ? `${selected.cvss3} — ${selected.cvss3Vec||""}` : "—" },
                        { l:"Exploit Public",  v:selected.exploitAvail ? `Yes (${selected.exploitEase||""})` : "No" },
                        { l:"Metasploit",      v:selected.metasploit ? "Module available" : "No" },
                        { l:"Patch Date",      v:selected.patchDate || "—" },
                        { l:"STIG Severity",   v:selected.stigSev ? `Category ${selected.stigSev}` : "Not mapped" },
                      ].map(k => (
                        <div key={k.l} style={{ background:C.panel2||C.panel, border:`1px solid ${C.border}`, borderRadius:5, padding:"7px 10px" }}>
                          <div style={{ ...mono, fontSize:9, color:C.textMute, fontWeight:600, marginBottom:2 }}>{k.l}</div>
                          <div style={{ fontSize:11, color:C.text }}>{k.v}</div>
                        </div>
                      ))}
                    </div>
                    {/* Description */}
                    <div style={{ marginBottom:13 }}>
                      <div style={{ ...mono, fontSize:10, color:C.textMute, fontWeight:600, marginBottom:5 }}>DESCRIPTION</div>
                      <div style={{ fontSize:11, color:C.textDim, lineHeight:1.8 }}>{selected.description}</div>
                    </div>
                    {/* Plugin output */}
                    {selected.pluginOutput && (
                      <div style={{ marginBottom:13 }}>
                        <div style={{ ...mono, fontSize:10, color:C.textMute, fontWeight:600, marginBottom:5 }}>PLUGIN OUTPUT (EVIDENCE)</div>
                        <div style={{ background:C.bg, border:`1px solid #0D2030`, borderRadius:6, padding:"10px 12px", ...mono, fontSize:11, color:"#7AB8D8", lineHeight:1.7, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                          {selected.pluginOutput}
                        </div>
                      </div>
                    )}
                    {/* Solution */}
                    <div style={{ background:`${C.green}08`, border:`1px solid ${C.green}25`, borderRadius:7, padding:13, marginBottom:13 }}>
                      <div style={{ ...mono, fontSize:10, color:C.green, fontWeight:600, marginBottom:5 }}>✓ REMEDIATION</div>
                      <div style={{ fontSize:11, color:C.textDim, lineHeight:1.7 }}>{selected.solution}</div>
                    </div>
                    {/* Suggested NIST controls */}
                    <div style={{ marginBottom:13 }}>
                      <div style={{ ...mono, fontSize:10, color:C.textMute, fontWeight:600, marginBottom:7 }}>SUGGESTED NIST 800-53 CONTROLS</div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {selected.suggestedControls.map(ctrl => (
                          <span key={ctrl} style={{ ...mono, fontSize:11, color:C.teal, background:`${C.teal}14`, border:`1px solid ${C.teal}30`, borderRadius:3, padding:"3px 9px", fontWeight:600 }}>{ctrl}</span>
                        ))}
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>addToPoam(selected)}
                        disabled={!!poamItems.find(p=>p.id===selected.id)}
                        style={{ ...mono, fontSize:11, background:poamItems.find(p=>p.id===selected.id)?`${C.teal}14`:C.teal, border:`1px solid ${C.teal}`, color:poamItems.find(p=>p.id===selected.id)?C.teal:C.bg, borderRadius:5, padding:"7px 16px", cursor:poamItems.find(p=>p.id===selected.id)?"not-allowed":"pointer", fontWeight:700 }}>
                        {poamItems.find(p=>p.id===selected.id) ? "✓ In POAM" : "+ ADD TO POAM"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ── HOSTS TAB ─────────────────────────────────────────────── */}
          {activeTab === "hosts" && (
            <div style={{ flex:1, overflowY:"auto", padding:20 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
                {scanData.hosts.map(h => {
                  const hFindings = scanData.findings.filter(f=>f.host.ip===h.ip);
                  const catI = hFindings.filter(f=>f.dodCat==="I").length;
                  const catII = hFindings.filter(f=>f.dodCat==="II").length;
                  return (
                    <div key={h.ip} style={{ background:C.panel, border:`1px solid ${catI>0?`${C.red}40`:C.border}`, borderRadius:10, padding:16 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:12 }}>
                        <div style={{ fontSize:28 }}>{h.os?.toLowerCase().includes("windows")?"⊞":h.os?.toLowerCase().includes("linux")?"🐧":"🖥"}</div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:C.white }}>{h.netbios || h.ip}</div>
                          <div style={{ ...mono, fontSize:11, color:C.blue }}>{h.ip}</div>
                          {h.fqdn && <div style={{ ...mono, fontSize:10, color:C.textMute }}>{h.fqdn}</div>}
                        </div>
                      </div>
                      {h.os && <div style={{ fontSize:11, color:C.textDim, marginBottom:10 }}>{h.os}</div>}
                      <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                        {catI>0 && <span style={{ ...mono, fontSize:10, color:C.red, background:`${C.red}14`, border:`1px solid ${C.red}30`, borderRadius:3, padding:"2px 7px" }}>CAT I: {catI}</span>}
                        {catII>0 && <span style={{ ...mono, fontSize:10, color:C.orange, background:`${C.orange}14`, border:`1px solid ${C.orange}30`, borderRadius:3, padding:"2px 7px" }}>CAT II: {catII}</span>}
                        <span style={{ ...mono, fontSize:10, color:C.green, background:`${C.green}14`, border:`1px solid ${C.green}30`, borderRadius:3, padding:"2px 7px" }}>
                          {h.credentialed?"✓ Credentialed":"Uncredentialed"}
                        </span>
                      </div>
                      <div style={{ ...mono, fontSize:10, color:C.textMute }}>{hFindings.length} total findings</div>
                      {h.startTime && <div style={{ ...mono, fontSize:10, color:C.textMute, marginTop:3 }}>Scan: {h.startTime}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* ── POAM TAB ──────────────────────────────────────────────── */}
          {activeTab === "poam" && (
            <div style={{ flex:1, overflowY:"auto", padding:20 }}>
              {poamItems.length === 0 ? (
                <div style={{ textAlign:"center", color:C.textMute, marginTop:60 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
                  <div style={{ fontSize:13, marginBottom:8 }}>No POAM items yet</div>
                  <div style={{ fontSize:11 }}>Go to Findings tab, click a finding, then click "+ ADD TO POAM"</div>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <div style={{ ...mono, fontSize:11, color:C.textMute, fontWeight:600 }}>{poamItems.length} POAM ITEMS</div>
                    <button onClick={exportPoam} style={{ ...mono, fontSize:11, background:C.teal, border:"none", color:C.bg, borderRadius:5, padding:"7px 16px", cursor:"pointer", fontWeight:700 }}>
                      ↓ EXPORT POAM CSV (eMASS FORMAT)
                    </button>
                  </div>
                  {poamItems.map(p => (
                    <div key={p.id} style={{ background:C.panel, border:`1px solid ${catColor[p.dodCat]||C.border}30`, borderRadius:8, padding:14, marginBottom:10 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start", justifyContent:"space-between" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
                            <span style={{ ...mono, fontWeight:700, fontSize:11, color:C.teal }}>{p.poamId}</span>
                            <CATBadge cat={p.dodCat} C={C} />
                            {p.cvss3 && <span style={{ ...mono, fontSize:11, color:C.textMute }}>CVSS3: {p.cvss3}</span>}
                          </div>
                          <div style={{ fontSize:12, fontWeight:600, color:C.white, marginBottom:4 }}>{p.pluginName}</div>
                          <div style={{ ...mono, fontSize:11, color:C.textMute, marginBottom:6 }}>
                            {p.host.ip} · Plugin {p.pluginID} {p.cve ? `· ${p.cve.split(",")[0]}` : ""}
                          </div>
                          <div style={{ fontSize:11, color:C.textDim, marginBottom:8 }}>{p.synopsis}</div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, ...mono, fontSize:10 }}>
                            <div><span style={{ color:C.textMute }}>Completion: </span><span style={{ color:C.white }}>{p.scheduledCompletion}</span></div>
                            <div><span style={{ color:C.textMute }}>POC: </span><span style={{ color:C.white }}>{p.resources}</span></div>
                            <div><span style={{ color:C.textMute }}>Status: </span><span style={{ color:C.green }}>{p.status}</span></div>
                          </div>
                        </div>
                        <button onClick={()=>setPoamItems(prev=>prev.filter(x=>x.id!==p.id))}
                          style={{ ...mono, fontSize:11, background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:4, padding:"3px 9px", cursor:"pointer" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          {/* ── EXPORT TAB ────────────────────────────────────────────── */}
          {activeTab === "export" && (
            <div style={{ flex:1, overflowY:"auto", padding:20 }}>
              <div style={{ maxWidth:600 }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute, fontWeight:600, letterSpacing:0.8, marginBottom:16 }}>EXPORT OPTIONS</div>
                {[
                  { icon:"📋", label:"eMASS POAM CSV", desc:`${poamItems.length} items ready · All CAT I/II/III findings with remediation timelines and responsible parties`, action: exportPoam, color:C.teal, disabled:poamItems.length===0 },
                  { icon:"📊", label:"All Findings CSV", desc:`${scanData.findings.length} total findings · Plugin ID, name, host, port, CAT, CVSS, CVE, synopsis, solution`, action:()=>{
                    const headers = ["Plugin ID","Plugin Name","Plugin Family","Host IP","Hostname","Port","Protocol","CAT","Nessus Severity","CVSS3","CVE","Synopsis","Solution","Exploit Available","Metasploit"];
                    const rows = scanData.findings.map(f=>[f.pluginID,`"${f.pluginName}"`,f.pluginFamily,f.host.ip,f.host.netbios||"",f.port,f.protocol,f.dodCat||"Info",f.sevLabel,f.cvss3||"",f.cve,`"${f.synopsis}"`,`"${f.solution}"`,f.exploitAvail?"Yes":"No",f.metasploit?"Yes":"No"]);
                    const csv=[headers,...rows].map(r=>r.join(",")).join("\n");
                    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="nessus_findings.csv";a.click();URL.revokeObjectURL(url);
                  }, color:C.blue, disabled:false },
                  { icon:"🔍", label:"CAT I Findings Only CSV", desc:`${scanData.findings.filter(f=>f.dodCat==="I").length} critical findings for immediate reporting to ISSM and AO`, action:()=>{
                    const catI=scanData.findings.filter(f=>f.dodCat==="I");
                    const headers=["Plugin ID","Plugin Name","Host IP","Port","CVE","CVSS3","Synopsis","Solution","Exploit Available"];
                    const rows=catI.map(f=>[f.pluginID,`"${f.pluginName}"`,f.host.ip,f.port,f.cve,f.cvss3||"",`"${f.synopsis}"`,`"${f.solution}"`,f.exploitAvail?"Yes":"No"]);
                    const csv=[headers,...rows].map(r=>r.join(",")).join("\n");
                    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="cat1_findings.csv";a.click();URL.revokeObjectURL(url);
                  }, color:C.red, disabled:scanData.findings.filter(f=>f.dodCat==="I").length===0 },
                ].map(opt => (
                  <div key={opt.label} style={{ background:C.panel, border:`1px solid ${opt.color}30`, borderRadius:10, padding:16, marginBottom:12, opacity:opt.disabled?0.5:1 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                        <span style={{ fontSize:24 }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:C.white, marginBottom:3 }}>{opt.label}</div>
                          <div style={{ fontSize:11, color:C.textDim }}>{opt.desc}</div>
                        </div>
                      </div>
                      <button onClick={opt.action} disabled={opt.disabled}
                        style={{ ...mono, fontSize:11, background:`${opt.color}14`, border:`1px solid ${opt.color}30`, color:opt.color, borderRadius:5, padding:"7px 16px", cursor:opt.disabled?"not-allowed":"pointer", fontWeight:700, whiteSpace:"nowrap" }}>
                        ↓ Export
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}