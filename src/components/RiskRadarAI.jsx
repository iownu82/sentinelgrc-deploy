import { useState, useRef, useEffect } from "react";

// ── Role configs ────────────────────────────────────────────────────────────
const ROLES = {
  issm: {
    label: "ISSM",
    title: "Information System Security Manager",
    color: "#00D4AA",
    bg: "rgba(0,212,170,0.08)",
    border: "rgba(0,212,170,0.25)",
    badge: "#003A2E",
    systemPrompt: `You are CSRMFC AI — an expert DoD GRC advisor embedded in the CSRMFC AI platform, assisting the Information System Security Manager (ISSM).

The ISSM is the senior security authority for the system. They own the ATO, approve POAMs, manage the RMF lifecycle, and are responsible to the Authorizing Official (AO).

Your expertise covers: NIST SP 800-53 Rev 5, NIST SP 800-171, CMMC 2.0 Level 2/3, CSRMC (DoD Sep 2025 replacement for RMF), CNSSI 1253, JSIG, DFARS 252.204-7012, eMASS, DISA STIGs, IAVA compliance, continuous monitoring (cATO), and SPRS scoring.

When responding:
- Be direct, authoritative, and precise — the ISSM doesn't need hand-holding
- Reference specific control families, control numbers, and regulatory citations
- Flag CAT I findings, open POAMs, and ATO expiration risks proactively
- Provide actionable guidance with specific steps, not generic advice
- When asked about controls, reference the exact NIST 800-53 Rev 5 control identifier
- Format responses clearly — use bullet points for action items, bold for critical items

You have visibility into this org's security posture. Always frame answers in the context of maintaining or achieving ATO.`,
  },
  isso: {
    label: "ISSO",
    title: "Information System Security Officer",
    color: "#1A7AFF",
    bg: "rgba(26,122,255,0.08)",
    border: "rgba(26,122,255,0.25)",
    badge: "#001840",
    systemPrompt: `You are CSRMFC AI — an expert DoD GRC advisor embedded in the CSRMFC AI platform, assisting the Information System Security Officer (ISSO).

The ISSO is the day-to-day security operator. They manage control implementation, run self-assessments, track POAMs, coordinate with system administrators, and report status to the ISSM.

Your expertise covers: NIST SP 800-53 Rev 5 control implementation, POAM management, STIG compliance, vulnerability triage (CAT I/II/III), evidence collection for ATO packages, quarterly self-inspection checklists, and eMASS documentation.

When responding:
- Focus on practical, implementable steps — the ISSO needs to get things done
- Explain the "why" behind controls when it helps implementation
- Help prioritize work: CAT I → open POAMs → upcoming milestones → routine compliance
- Provide specific evidence artifacts needed for each control family
- Reference STIG IDs and IAVA numbers when relevant
- Keep guidance actionable — what to do today, this week, before the next assessment

Frame everything around reducing risk and supporting the ISSM's ATO decisions.`,
  },
  sysadmin: {
    label: "SysAdmin",
    title: "System Administrator",
    color: "#FF8C00",
    bg: "rgba(255,140,0,0.08)",
    border: "rgba(255,140,0,0.25)",
    badge: "#3A2000",
    systemPrompt: `You are CSRMFC AI — a DoD technical security advisor embedded in the CSRMFC AI platform, assisting the System Administrator.

The SysAdmin implements technical security controls on the system. They configure hardware/software per STIG requirements, manage the approved hardware and software lists, submit ITRs (Information Technology Requests), and support the ISSO with technical evidence.

Your expertise covers: DISA STIG implementation (Windows, Linux, network devices, applications), SCAP/ACAS scans, approved hardware/software registry management, ITR submission workflows, CM-6 configuration baselines, patch management (IAVA compliance), and generating technical evidence for audits.

When responding:
- Be technical and specific — reference exact STIG Rule IDs, registry paths, CLI commands
- Provide step-by-step implementation guidance
- Flag STIGs that require ISSO/ISSM approval before implementation
- Help translate security requirements into concrete technical tasks
- Reference specific tools: ACAS/Nessus, SCAP Compliance Checker, eMASS, STIG Viewer
- Keep answers concise — sysadmins need commands and configs, not essays

Always note when a change requires change control board (CCB) approval or an ITR submission.`,
  },
};

// ── Suggested prompts per role ───────────────────────────────────────────────
const SUGGESTIONS = {
  issm: [
    "What controls are highest risk given my open POAMs?",
    "Draft an AO briefing summary for my current security posture",
    "What does CSRMC require that RMF didn't?",
    "What's my SPRS score impact if I close these CAT IIs?",
    "Generate a POA&M milestone update for AU and AC families",
  ],
  isso: [
    "What evidence do I need for AC-2 compliance?",
    "Walk me through the quarterly self-inspection checklist",
    "How do I document inherited controls in eMASS?",
    "What STIG findings map to my open POAM items?",
    "Help me write a control implementation statement for IA-2",
  ],
  sysadmin: [
    "What STIGs apply to Windows Server 2022?",
    "How do I fix CAT I finding V-254239?",
    "Walk me through submitting an ITR for new hardware",
    "What's the SCAP scan procedure for a new system?",
    "Which registry settings satisfy CM-6 baseline requirements?",
  ],
};

// ── Message bubble ───────────────────────────────────────────────────────────
function Message({ msg, roleColor }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
      gap: 10,
      alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0, marginTop: 2,
          boxShadow: `0 0 12px ${roleColor}44`,
        }}>🛡</div>
      )}
      <div style={{
        maxWidth: "78%",
        background: isUser
          ? "linear-gradient(135deg, #1A3A5C, #0D2040)"
          : "rgba(255,255,255,0.04)",
        border: isUser
          ? "1px solid rgba(26,122,255,0.3)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
        padding: "12px 16px",
        fontSize: 13,
        lineHeight: 1.7,
        color: isUser ? "#C8D8E8" : "#D8E8F0",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #1A3A5C, #0D2040)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, flexShrink: 0, marginTop: 2,
          border: "1px solid rgba(26,122,255,0.3)",
        }}>👤</div>
      )}
    </div>
  );
}

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots({ color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}, ${color}88)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, boxShadow: `0 0 12px ${color}44`,
      }}>🛡</div>
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "4px 16px 16px 16px",
        padding: "14px 18px",
        display: "flex", gap: 5, alignItems: "center",
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: color,
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CSRMFCAIAdvisor() {
  const [role, setRole] = useState("issm");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const cfg = ROLES[role];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Reset conversation when role switches
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [role]);

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    setError(null);

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: cfg.systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const reply = data.content?.[0]?.text || "No response received.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{
      width: "100%", height: "100vh",
      background: "linear-gradient(160deg, #020C14 0%, #030F1A 50%, #040D18 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Courier New', Courier, monospace",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,212,170,0); }
          50% { box-shadow: 0 0 0 6px rgba(0,212,170,0.1); }
        }
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #1A3A5C; border-radius: 2px; }
        .msg-wrapper { animation: fadeIn 0.25s ease; }
        .suggestion-btn:hover { background: rgba(255,255,255,0.07) !important; transform: translateY(-1px); }
        .role-btn:hover { opacity: 0.85; }
        .send-btn:hover { filter: brightness(1.15); transform: scale(1.04); }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "16px 20px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(10px)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}44)`,
              border: `1px solid ${cfg.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, transition: "all 0.3s",
            }}>🛡</div>
            <div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: cfg.color,
                letterSpacing: 2, textTransform: "uppercase",
              }}>
                CSRMFC AI
              </div>
              <div style={{ fontSize: 10, color: "#3A5570", letterSpacing: 1 }}>
                {cfg.title} · DoD GRC Advisor
              </div>
            </div>
          </div>

          {/* Role switcher */}
          <div style={{
            display: "flex", gap: 4, padding: "3px",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
          }}>
            {Object.entries(ROLES).map(([key, r]) => (
              <button key={key} className="role-btn" onClick={() => setRole(key)} style={{
                padding: "5px 10px",
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                fontFamily: "inherit",
                border: "none", borderRadius: 5, cursor: "pointer",
                transition: "all 0.2s",
                background: role === key
                  ? `linear-gradient(135deg, ${r.color}33, ${r.color}22)`
                  : "transparent",
                color: role === key ? r.color : "#3A5570",
                outline: role === key ? `1px solid ${r.color}44` : "none",
              }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          display: "flex", gap: 16, marginTop: 10,
          fontSize: 9, letterSpacing: 1.5, color: "#2A4A66",
        }}>
          {["NIST 800-53 REV 5", "CMMC 2.0", "CSRMC", "CNSSI 1253", "DFARS 7012"].map(f => (
            <span key={f} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "20px 20px 8px",
        scrollbarWidth: "thin", scrollbarColor: "#1A3A5C transparent",
      }}>
        {isEmpty ? (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Welcome */}
            <div style={{
              textAlign: "center", marginBottom: 28, paddingTop: 16,
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 56, height: 56, borderRadius: 14,
                background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}11)`,
                border: `1px solid ${cfg.color}44`,
                fontSize: 26, marginBottom: 12,
                animation: "pulse 3s ease infinite",
              }}>🛡</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#C8D8E8", marginBottom: 4 }}>
                CSRMFC AI — {cfg.label} Mode
              </div>
              <div style={{ fontSize: 11, color: "#3A5570", lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
                Context-aware DoD GRC advisor. Ask about controls, POAMs,<br />
                STIGs, ATOs, CSRMC, CMMC, or anything in your security program.
              </div>
            </div>

            {/* Suggested prompts */}
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 9, letterSpacing: 2, color: "#2A4A66",
                textTransform: "uppercase", marginBottom: 10,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                Suggested for {cfg.label}
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SUGGESTIONS[role].map((s, i) => (
                  <button key={i} className="suggestion-btn" onClick={() => send(s)} style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid rgba(255,255,255,0.07)`,
                    borderLeft: `3px solid ${cfg.color}66`,
                    borderRadius: 6, padding: "9px 14px",
                    fontSize: 11, color: "#7A9AB8",
                    textAlign: "left", cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((m, i) => (
              <div key={i} className="msg-wrapper">
                <Message msg={m} roleColor={cfg.color} />
              </div>
            ))}
            {loading && <TypingDots color={cfg.color} />}
            {error && (
              <div style={{
                background: "rgba(255,68,68,0.08)",
                border: "1px solid rgba(255,68,68,0.2)",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 11, color: "#FF8888", marginBottom: 16,
              }}>
                ⚠ {error}
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{
        padding: "12px 16px 16px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(10px)",
        flexShrink: 0,
      }}>
        {!isEmpty && (
          <div style={{
            display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap",
          }}>
            {SUGGESTIONS[role].slice(0, 3).map((s, i) => (
              <button key={i} className="suggestion-btn" onClick={() => send(s)} style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(255,255,255,0.06)`,
                borderRadius: 20, padding: "3px 10px",
                fontSize: 10, color: "#3A5570",
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}>
                {s.length > 40 ? s.slice(0, 37) + "…" : s}
              </button>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", gap: 10, alignItems: "flex-end",
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${input ? cfg.color + "44" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 10, padding: "8px 8px 8px 14px",
          transition: "border-color 0.2s",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ask your ${cfg.label} question... (Enter to send, Shift+Enter for newline)`}
            disabled={loading}
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#C8D8E8", fontSize: 12, fontFamily: "inherit",
              resize: "none", lineHeight: 1.6, padding: 0,
              minHeight: 20, maxHeight: 120, overflowY: "auto",
              scrollbarWidth: "thin",
            }}
            onInput={e => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            className="send-btn"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 34, height: 34, borderRadius: 7,
              background: input.trim() && !loading
                ? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}BB)`
                : "rgba(255,255,255,0.05)",
              border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, transition: "all 0.2s", flexShrink: 0,
              color: input.trim() && !loading ? "#020A10" : "#2A4A66",
            }}
          >
            {loading ? "⏳" : "↑"}
          </button>
        </div>
        <div style={{
          fontSize: 9, color: "#1A3A5C", textAlign: "center",
          marginTop: 6, letterSpacing: 1,
        }}>
          CSRMFC AI AI · {cfg.label} CONTEXT · POWERED BY CLAUDE · AU-2 LOGGED
        </div>
      </div>
    </div>
  );
}
