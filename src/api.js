// ─────────────────────────────────────────────────────────
// api.js  —  Anthropic API helpers for Tech Flash Weekly
// ─────────────────────────────────────────────────────────

const API_URL        = "https://api.anthropic.com/v1/messages";
const MODEL          = "claude-sonnet-4-20250514";
const MAX_TOKENS     = 16000;
const MAX_TOOL_TURNS = 8;
const TIMEOUT_MS     = 120_000; // 2-minute timeout

// ── API KEY ────────────────────────────────────────────────
// Vite exposes env vars prefixed with VITE_ to the browser bundle.
// Set VITE_ANTHROPIC_API_KEY in:
//   • Local dev  → .env file in the project root (never commit this file)
//   • Vercel     → Project Settings → Environment Variables
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? "";

/**
 * Call this before generate() to surface a clear error in the UI
 * rather than a cryptic 401 from the API.
 */
export function getApiKeyStatus() {
  if (!API_KEY || API_KEY.trim() === "") return "missing";
  if (!API_KEY.startsWith("sk-ant-"))     return "invalid";
  return "ok";
}

// ── SYSTEM PROMPT ──────────────────────────────────────────
export const SYSTEM_PROMPT = `You are the generator for "Tech Flash Weekly", a LinkedIn carousel series.

STEP 1 — SEARCH
Use web_search to find the TOP 5 biggest global IT and AI breaking news stories from the PAST 7 DAYS.
Run at least 3 different searches, e.g.:
  - "biggest AI tech news this week [month year]"
  - "global tech breakthrough news [current week]"
  - "OpenAI Google Microsoft Apple Meta news [current week]"
Pick 5 stories purely by GLOBAL IMPACT. All 5 have EQUAL PRIORITY — no topic is reserved.

STEP 2 — BUILD HTML
Generate a complete self-contained 540×540px LinkedIn carousel HTML file with:

SLIDES: 1 cover slide + 4 news story slides (5 total)

STYLE — Glitch Cyberpunk (professional):
  - Dark bg (#04040a per slide)
  - Scanlines overlay (z-index:8, repeating-linear-gradient, 8% opacity)
  - CRT vignette (z-index:7, radial-gradient dark edges)
  - Animated sweep bar (z-index:9, 2px line, 7s linear, 45% opacity)
  - Corner bracket marks (z-index:13, 12px, accent color 50%)
  - Ambient glow blob (filter:blur(80px), 7-9% opacity)

FONTS (Google Fonts CDN):
  - Orbitron: headlines (~1.42rem, weight 700, mixed case)
  - Share Tech Mono: labels/tags (0.65rem, spaced uppercase)
  - Inter: body copy (0.82rem, rgba white 0.52)

CHARACTER (every slide):
  - Unique inline SVG cartoon, thematic to story topic
  - position:absolute, top-right corner, z-index:16
  - Glowing neon eyes (accent color), chest display with story text
  - float animation: translateY(0 to -11px), 4s ease-in-out infinite
  - glitch animation: RGB drop-shadow split every ~5s

Z-INDEX STACK — MUST be exact:
  grid/blob=1 | vignette=7 | scanlines=8 | sweep=9 |
  corners=13 | all text/content=14 | bottom-bar=15 |
  characters=16 | nav-buttons=20

ACCENT COLORS:
  AI/Anthropic/OpenAI → #8c64ff
  Microsoft/Azure     → #0078d7
  Google/Gemini       → #4285f4
  Hardware/NASA/Chips → #c8a000
  GitHub/Open Source  → #50c83c
  Finance/IPO/Markets → #c8a000
  Jobs/Layoffs        → #dc2850
  Space/Deep Tech     → #00ffb4
  Cover slide         → #00ffb4

BOTTOM BAR (every slide, minimal):
  Left: "Tech Flash Weekly" — Orbitron 0.58rem rgba(255,255,255,0.32)
  Center: 5px dot — accent color with glow
  Right: "0X / 05" — Share Tech Mono 0.62rem rgba(255,255,255,0.2)
  Background: rgba(4,4,10,0.92) + backdrop-blur(8px)
  Border-top: 1px rgba(255,255,255,0.06)

SOURCE TAG (content slides):
  "── Source · Date" via Share Tech Mono 0.65rem, accent color 75% opacity

SOURCE LINK CHIP (content slides, bottom-right corner inside slide, above the bar):
  - Position: absolute, bottom: 52px (just above the bar), right: 14px, z-index: 14
  - An anchor tag <a href="FULL_URL" target="_blank" rel="noopener noreferrer">
  - Style: display:inline-flex; align-items:center; gap:5px;
           background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
           border-radius:3px; padding:4px 9px;
           font-family:'Share Tech Mono',monospace; font-size:.55rem;
           color:rgba(255,255,255,0.35); letter-spacing:1px; text-decoration:none;
           transition:all .2s;
  - Content: a small external-link SVG icon (10x10) + "READ ARTICLE"
  - On hover: color rgba(255,255,255,0.7), border-color rgba(255,255,255,0.25), background rgba(255,255,255,0.09)
  - Cover slide does NOT have this chip

LAYOUT: text bottom-left (z-index:14), character top-right (z-index:16)
NAV: arrow buttons (z-index:20) + dot indicators + ArrowLeft/Right keys + touch swipe

STEP 3 — OUTPUT
Return ONLY a raw JSON object. No markdown, no backticks, no explanation before or after.
{
  "stories": [
    {"slide":1,"title":"Cover","source":"","date":"","summary":"","sourceUrl":""},
    {"slide":2,"title":"...","source":"...","date":"...","summary":"one sentence","sourceUrl":"https://full-article-url"},
    {"slide":3,"title":"...","source":"...","date":"...","summary":"one sentence","sourceUrl":"https://full-article-url"},
    {"slide":4,"title":"...","source":"...","date":"...","summary":"one sentence","sourceUrl":"https://full-article-url"},
    {"slide":5,"title":"...","source":"...","date":"...","summary":"one sentence","sourceUrl":"https://full-article-url"}
  ],
  "caption": "Hook line\\nSwipe through 👉\\n#Tag1 #Tag2 #TechNews #AIWeekly",
  "html": "<complete self-contained HTML string>"
}`;

// ── HELPERS ────────────────────────────────────────────────

/**
 * fetch() wrapped with an AbortController timeout.
 */
function fetchWithTimeout(url, options, ms) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}

/**
 * Full agentic tool-use loop.
 * The Anthropic API may return tool_use blocks that must be answered
 * with tool_result blocks before the model produces its final text.
 * This loop keeps going until stop_reason === "end_turn".
 */
export async function runAgentLoop(onLog) {
  const keyStatus = getApiKeyStatus();
  if (keyStatus === "missing") throw new Error("API key is missing. Add VITE_ANTHROPIC_API_KEY to your .env file or Vercel environment variables.");
  if (keyStatus === "invalid") throw new Error("API key looks invalid — it should start with 'sk-ant-'. Please check your key.");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const messages = [
    {
      role: "user",
      content: `Today is ${today}. Find the top 5 biggest global IT and AI news stories from the past 7 days, then generate the complete Glitch Cyberpunk LinkedIn carousel HTML. Return ONLY the raw JSON object.`,
    },
  ];

  for (let turn = 1; turn <= MAX_TOOL_TURNS; turn++) {
    onLog(`🔄 API call ${turn}...`);

    const res = await fetchWithTimeout(
      API_URL,
      {
        method:  "POST",
        headers: {
          "Content-Type":            "application/json",
          "x-api-key":               API_KEY,
          "anthropic-version":       "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model:      MODEL,
          max_tokens: MAX_TOKENS,
          system:     SYSTEM_PROMPT,
          tools:      [{ type: "web_search_20250305", name: "web_search" }],
          messages,
        }),
      },
      TIMEOUT_MS,
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // Surface friendly messages for common errors
      if (res.status === 401) throw new Error("Invalid API key (401). Double-check your VITE_ANTHROPIC_API_KEY.");
      if (res.status === 429) throw new Error("Rate limit hit (429). Wait a moment and try again.");
      if (res.status === 529) throw new Error("Anthropic API is overloaded (529). Try again in a few seconds.");
      throw new Error(`API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const { content, stop_reason } = data;

    // Log any searches the model ran
    content
      .filter(b => b.type === "tool_use" && b.name === "web_search")
      .forEach(b => onLog(`🌐 Searching: "${b.input?.query}"`));

    // If done, return the full text
    const toolUseBlocks = content.filter(b => b.type === "tool_use");
    if (stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      const text = content.filter(b => b.type === "text").map(b => b.text).join("");
      onLog("✅ Searches complete — building carousel...");
      return text;
    }

    // Append assistant turn + tool_result responses and loop
    messages.push({ role: "assistant", content });
    messages.push({
      role: "user",
      content: toolUseBlocks.map(b => ({
        type:        "tool_result",
        tool_use_id: b.id,
        content:     "",
      })),
    });
  }

  throw new Error(`Exceeded ${MAX_TOOL_TURNS} API turns without finishing.`);
}

/**
 * Robustly extract the outermost JSON object from a string.
 * Handles text/markdown before or after, and escaped chars inside strings.
 */
export function extractJSON(raw) {
  const s = raw.replace(/```json\s*/gi, "").replace(/```/g, "");
  const start = s.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in API response.");

  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escaped)         { escaped = false; continue; }
    if (ch === "\\")     { escaped = true;  continue; }
    if (ch === '"')      { inString = !inString; continue; }
    if (inString)        continue;
    if (ch === "{")      depth++;
    else if (ch === "}") { depth--; if (depth === 0) return s.slice(start, i + 1); }
  }
  throw new Error("Malformed JSON: unmatched braces in API response.");
}
