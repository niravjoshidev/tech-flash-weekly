// ─────────────────────────────────────────────────────────
// App.jsx  —  Tech Flash Weekly · LinkedIn Carousel Generator
// ─────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from "react";
import "./index.css";
import { runAgentLoop, extractJSON, getApiKeyStatus } from "./api.js";

const ACCENT = "#00ffb4";

// ─────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────

/** Blinking terminal cursor */
function BlinkCursor() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), 530);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{
      display: "inline-block", width: 7, height: 13,
      background: on ? ACCENT : "transparent",
      verticalAlign: "text-bottom",
    }} />
  );
}

/** Divider with center label */
function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(0,255,180,0.1)" }} />
      <div style={{ fontSize: ".56rem", color: "rgba(0,255,180,0.35)", letterSpacing: 2, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 1, background: "rgba(0,255,180,0.1)" }} />
    </div>
  );
}

/** Window chrome (traffic-light dots) */
function WindowChrome({ title }) {
  return (
    <div style={{
      background: "rgba(0,255,180,0.04)",
      borderBottom: "1px solid rgba(0,255,180,0.09)",
      padding: "11px 18px",
      display: "flex", alignItems: "center", gap: 7,
    }}>
      {["#dc2850", "#c8a000", "#50c83c"].map((c, i) => (
        <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block", opacity: .8 }} />
      ))}
      <span style={{ marginLeft: 10, fontSize: ".58rem", color: "rgba(0,255,180,0.38)", letterSpacing: 2 }}>
        {title}
      </span>
    </div>
  );
}

/** Auto-scrolling terminal log panel */
function TerminalLog({ logs, isRunning }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div style={{
      marginTop: 18,
      background: "#000",
      border: "1px solid rgba(0,255,180,0.14)",
      borderRadius: 3,
      padding: "13px 15px",
      maxHeight: 170,
      overflowY: "auto",
    }}>
      {logs.map((line, i) => (
        <div key={i} style={{
          fontSize: ".68rem", lineHeight: 1.9, letterSpacing: .4,
          color: line.startsWith("❌") ? "#dc2850"
            : line.startsWith("✅") ? "#50c83c"
              : "rgba(0,255,180,0.7)",
        }}>
          {line}
        </div>
      ))}
      {isRunning && (
        <div style={{ marginTop: 4 }}>
          <BlinkCursor />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

/** What the generator auto-applies */
function CriteriaList() {
  const items = [
    "Live web search — top 5 global IT/AI stories from the past 7 days",
    "Equal priority for every story — no reserved topic or persona",
    "Real stats, company names, sources and dates on every slide",
    "Source link chip on every slide — readers can verify the article",
    "Glitch Cyberpunk style · unique SVG cartoon character per slide",
    "540×540px carousel · screenshot-ready · post on LinkedIn Monday",
  ];
  return (
    <div style={{
      background: "rgba(0,255,180,0.03)",
      border: "1px solid rgba(0,255,180,0.1)",
      borderLeft: `3px solid ${ACCENT}`,
      borderRadius: "0 4px 4px 0",
      padding: "14px 16px",
      marginBottom: 26,
    }}>
      <div style={{ fontSize: ".56rem", color: "rgba(0,255,180,0.42)", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
        Auto-criteria
      </div>
      {items.map((text, i) => (
        <div key={i} style={{
          display: "flex", gap: 8,
          fontSize: ".71rem", color: "rgba(255,255,255,0.46)",
          lineHeight: 1.6, marginBottom: i < items.length - 1 ? 4 : 0,
        }}>
          <span style={{ color: ACCENT, flexShrink: 0 }}>▸</span>
          {text}
        </div>
      ))}
    </div>
  );
}

/** Single story row with source link */
function StoryRow({ story, index }) {
  const hasUrl = story.sourceUrl && story.sourceUrl.startsWith("http");
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "11px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      {/* Slide number badge */}
      <div style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: ".62rem", color: ACCENT,
        fontWeight: 700, flexShrink: 0, marginTop: 2,
        minWidth: 20,
      }}>
        0{story.slide}
      </div>

      {/* Story content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: ".78rem", fontWeight: 600,
          color: "rgba(255,255,255,0.88)",
          fontFamily: "'Inter', sans-serif",
          lineHeight: 1.4, marginBottom: 4,
        }}>
          {story.title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {(story.source || story.date) && (
            <span style={{ fontSize: ".6rem", color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
              {[story.source, story.date].filter(Boolean).join(" · ")}
            </span>
          )}

          {/* Source link badge */}
          {hasUrl && (
            <a
              href={story.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "rgba(0,255,180,0.07)",
                border: "1px solid rgba(0,255,180,0.2)",
                borderRadius: 3,
                padding: "2px 8px",
                fontSize: ".58rem", color: "rgba(0,255,180,0.65)",
                letterSpacing: 1, textDecoration: "none",
                fontFamily: "'Share Tech Mono', monospace",
                transition: "all .2s",
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(0,255,180,0.14)";
                e.currentTarget.style.color = ACCENT;
                e.currentTarget.style.borderColor = "rgba(0,255,180,0.5)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(0,255,180,0.07)";
                e.currentTarget.style.color = "rgba(0,255,180,0.65)";
                e.currentTarget.style.borderColor = "rgba(0,255,180,0.2)";
              }}
            >
              {/* External link icon */}
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M5.5 1H9v3.5M9 1L4 6M2 2H1v7h7V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              READ ARTICLE
            </a>
          )}
        </div>

        {story.summary && (
          <div style={{
            fontSize: ".67rem", color: "rgba(255,255,255,0.38)",
            marginTop: 5, lineHeight: 1.5,
            fontFamily: "'Inter', sans-serif",
          }}>
            {story.summary}
          </div>
        )}
      </div>
    </div>
  );
}

/** Story list panel */
function StoryList({ stories }) {
  const newsStories = stories.filter(s => s.slide > 1);
  if (newsStories.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: ".56rem", color: "rgba(0,255,180,0.42)", letterSpacing: 2, marginBottom: 4, textTransform: "uppercase" }}>
        This week's 5 stories
      </div>
      {newsStories.map((s, i) => (
        <StoryRow key={i} story={s} index={i} />
      ))}
    </div>
  );
}

/** LinkedIn caption box with copy */
function CaptionBox({ caption }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      // Fallback for browsers blocking clipboard API
      const el = document.createElement("textarea");
      el.value = caption;
      Object.assign(el.style, { position: "fixed", opacity: "0" });
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (!caption) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 3, padding: "14px 15px", marginBottom: 18,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: ".56rem", color: "rgba(255,255,255,0.26)", letterSpacing: 2, textTransform: "uppercase" }}>
          LinkedIn Caption
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? "rgba(80,200,60,0.14)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${copied ? "rgba(80,200,60,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 2, padding: "4px 10px",
            color: copied ? "#50c83c" : "rgba(255,255,255,0.4)",
            fontSize: ".58rem", cursor: "pointer", letterSpacing: 1,
            fontFamily: "'Share Tech Mono', monospace",
            transition: "all .2s",
          }}
        >
          {copied ? "✓ COPIED" : "COPY"}
        </button>
      </div>
      <div style={{
        fontSize: ".78rem", color: "rgba(255,255,255,0.52)",
        lineHeight: 1.75, whiteSpace: "pre-line",
        fontFamily: "'Inter', sans-serif",
      }}>
        {caption}
      </div>
    </div>
  );
}

/** Styled action button */
function ActionButton({ onClick, disabled, variant = "primary", children }) {
  const styles = {
    primary: {
      background: disabled
        ? "rgba(0,255,180,0.04)"
        : "linear-gradient(135deg, rgba(0,255,180,0.13), rgba(0,255,180,0.07))",
      border: `1.5px solid ${disabled ? "rgba(0,255,180,0.18)" : ACCENT}`,
      color: disabled ? "rgba(0,255,180,0.35)" : ACCENT,
      textShadow: disabled ? "none" : `0 0 10px ${ACCENT}`,
      boxShadow: disabled ? "none" : "0 0 22px rgba(0,255,180,0.07)",
    },
    download: {
      background: "linear-gradient(135deg, rgba(0,120,215,0.13), rgba(0,120,215,0.07))",
      border: "1.5px solid #0078d7",
      color: "#0078d7",
      textShadow: "0 0 8px #0078d7",
      boxShadow: "0 0 18px rgba(0,120,215,0.07)",
    },
    ghost: {
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.26)",
      textShadow: "none",
      boxShadow: "none",
    },
  };

  const s = styles[variant];

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "13px 24px",
        ...s,
        borderRadius: 3,
        fontFamily: variant === "ghost" ? "'Share Tech Mono', monospace" : "'Orbitron', monospace",
        fontSize: variant === "ghost" ? ".66rem" : variant === "download" ? ".8rem" : ".92rem",
        fontWeight: 700, letterSpacing: variant === "ghost" ? 2 : 3,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .2s",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        marginBottom: variant !== "ghost" ? 10 : 0,
      }}
    >
      {children}
    </button>
  );
}


/** Shows a warning banner when the API key env var is not set */
function ApiKeyBanner() {
  const status = getApiKeyStatus();
  if (status === "ok") return null;

  const isMissing = status === "missing";

  return (
    <div style={{
      background: "rgba(200,160,0,0.07)",
      border: "1px solid rgba(200,160,0,0.25)",
      borderLeft: "3px solid #c8a000",
      borderRadius: "0 4px 4px 0",
      padding: "13px 16px",
      marginBottom: 20,
    }}>
      <div style={{ fontSize: ".62rem", color: "#c8a000", fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>
        ⚠ API KEY {isMissing ? "NOT CONFIGURED" : "LOOKS INVALID"}
      </div>
      <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
        {isMissing
          ? "No Anthropic API key found. The generator won't work until you add one."
          : "Your key doesn't look right — it should start with 'sk-ant-'."}
      </div>
      <div style={{ marginTop: 10, fontSize: ".68rem", lineHeight: 1.8, fontFamily: "'Share Tech Mono', monospace", color: "rgba(200,160,0,0.7)" }}>
        <div>LOCAL DEV → create <span style={{ color: "#c8a000" }}>/.env</span> and add:</div>
        <div style={{
          background: "#000", border: "1px solid rgba(200,160,0,0.2)",
          borderRadius: 3, padding: "6px 10px", margin: "6px 0",
          fontSize: ".66rem", color: "#c8a000", userSelect: "all",
        }}>
          VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
        </div>
        <div>VERCEL → Project Settings → Environment Variables → add the same key</div>
      </div>
      <a
        href="https://console.anthropic.com/settings/keys"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          marginTop: 10, fontSize: ".62rem",
          color: "rgba(200,160,0,0.8)", textDecoration: "none",
          fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1,
        }}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M5.5 1H9v3.5M9 1L4 6M2 2H1v7h7V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        GET YOUR API KEY FROM ANTHROPIC CONSOLE
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [status, setStatus] = useState("idle");   // idle | loading | done | error
  const [stories, setStories] = useState([]);
  const [caption, setCaption] = useState("");
  const [html, setHtml] = useState("");
  const [logs, setLogs] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const addLog = useCallback((msg) => setLogs(prev => [...prev, msg]), []);

  const reset = useCallback(() => {
    setStatus("idle");
    setStories([]);
    setCaption("");
    setHtml("");
    setLogs([]);
    setErrorMsg("");
  }, []);

  const generate = useCallback(async () => {
    reset();
    setStatus("loading");
    addLog("⚡ Initializing Tech Flash Weekly generator...");
    addLog("🔍 Starting live global news search...");

    // Validate API key before hitting the network
    const keyStatus = getApiKeyStatus();
    if (keyStatus !== "ok") {
      const msg = keyStatus === "missing"
        ? "API key missing. Add VITE_ANTHROPIC_API_KEY to your .env file or Vercel environment variables."
        : "API key looks invalid — it should start with 'sk-ant-'. Please check your key.";
      addLog(`❌ ${msg}`);
      setErrorMsg(msg);
      setStatus("error");
      return;
    }

    try {
      const rawText = await runAgentLoop(addLog);

      addLog("🎨 Parsing carousel data...");
      const jsonStr = extractJSON(rawText);
      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!Array.isArray(parsed.stories) || parsed.stories.length === 0)
        throw new Error("Response missing 'stories' array.");
      if (typeof parsed.html !== "string" || parsed.html.trim().length < 500)
        throw new Error("Response missing or incomplete 'html' field.");

      setStories(parsed.stories);
      setCaption(parsed.caption || "");
      setHtml(parsed.html);
      addLog("✅ Carousel ready — download and post Monday!");
      setStatus("done");

    } catch (err) {
      const msg = err.name === "AbortError"
        ? "Request timed out (2 min). Please try again."
        : err.message;
      addLog(`❌ ${msg}`);
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [reset, addLog]);

  const download = useCallback(() => {
    if (!html) return;
    let url = null;
    try {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tech-flash-weekly-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }, [html]);

  const isLoading = status === "loading";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#05050a",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "44px 20px 64px",
      backgroundImage: `
        linear-gradient(rgba(0,255,180,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,180,0.02) 1px, transparent 1px)
      `,
      backgroundSize: "54px 54px",
    }}>

      {/* ── HEADER ── */}
      <header style={{ textAlign: "center", marginBottom: 44 }}>
        <h1 style={{
          fontFamily: "'Orbitron', monospace",
          color: ACCENT,
          textShadow: `0 0 14px ${ACCENT}, 0 0 28px ${ACCENT}22`,
          fontSize: "2.1rem", fontWeight: 700,
          letterSpacing: 2, lineHeight: 1.1, margin: "0 0 10px",
        }}>
          Tech Flash<br />Weekly
        </h1>
        <p style={{ fontSize: ".7rem", color: "rgba(255,255,255,0.26)", letterSpacing: 2, margin: 0 }}>
          One click → Latest global IT &amp; AI news → LinkedIn carousel
        </p>
      </header>

      {/* ── MAIN CARD ── */}
      <main style={{
        width: "100%", maxWidth: 640,
        background: "rgba(0,0,0,0.5)",
        border: "1px solid rgba(0,255,180,0.13)",
        borderRadius: 4, overflow: "hidden",
      }}>
        <WindowChrome title="CAROUSEL_GENERATOR_v3.1 — TECH_FLASH_WEEKLY" />

        <div style={{ padding: "26px 24px 30px" }}>

          <ApiKeyBanner />

          <CriteriaList />

          {/* Generate button */}
          <ActionButton onClick={generate} disabled={isLoading}>
            {isLoading ? (
              <><BlinkCursor /><span>GENERATING...</span></>
            ) : (
              <span>⚡ &nbsp; GENERATE THIS WEEK'S CAROUSEL</span>
            )}
          </ActionButton>

          <TerminalLog logs={logs} isRunning={isLoading} />

          {/* Error state */}
          {isError && (
            <div style={{
              marginTop: 16,
              background: "rgba(220,40,80,0.06)",
              border: "1px solid rgba(220,40,80,0.22)",
              borderLeft: "3px solid #dc2850",
              borderRadius: "0 4px 4px 0",
              padding: "12px 14px",
              display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 12,
            }}>
              <div style={{ fontSize: ".7rem", color: "#dc2850", lineHeight: 1.5 }}>
                {errorMsg || "Something went wrong. Please try again."}
              </div>
              <button
                onClick={generate}
                style={{
                  background: "rgba(220,40,80,0.13)",
                  border: "1px solid rgba(220,40,80,0.32)",
                  borderRadius: 2, padding: "6px 12px",
                  color: "#dc2850", fontFamily: "'Share Tech Mono', monospace",
                  fontSize: ".6rem", letterSpacing: 1, cursor: "pointer", flexShrink: 0,
                }}
              >
                RETRY
              </button>
            </div>
          )}

          {/* Results */}
          {isDone && (
            <>
              <Divider label="Output" />
              <StoryList stories={stories} />
              <CaptionBox caption={caption} />
              <ActionButton onClick={download} variant="download">
                ↓ &nbsp; DOWNLOAD CAROUSEL HTML
              </ActionButton>
              <ActionButton onClick={generate} variant="ghost">
                ↺ &nbsp; REGENERATE WITH LATEST NEWS
              </ActionButton>
            </>
          )}

        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ marginTop: 28, fontSize: ".56rem", color: "rgba(255,255,255,0.1)", letterSpacing: 2, textAlign: "center" }}>
        TECH_FLASH_WEEKLY · AUTOMATED · EVERY MONDAY
      </footer>

    </div>
  );
}
