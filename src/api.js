// ─────────────────────────────────────────────────────────
// api.js  —  Google Gemini API helpers for Tech Flash Weekly
// ─────────────────────────────────────────────────────────

const MODEL          = "gemini-2.5-flash";
const TIMEOUT_MS     = 120_000; // 2-minute timeout

// ── API KEY ────────────────────────────────────────────────
// Vite exposes env vars prefixed with VITE_ to the browser bundle.
// Set VITE_GEMINI_API_KEY in:
//   • Local dev  → .env file in the project root (never commit this file)
//   • Vercel     → Project Settings → Environment Variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";

/**
 * Call this before generate() to surface a clear error in the UI
 * rather than a cryptic 401 from the API.
 */
export function getApiKeyStatus() {
  if (!API_KEY || API_KEY.trim() === "") return "missing";
  const isValidPrefix = API_KEY.startsWith("AIzaSy") || API_KEY.startsWith("AQ");
  if (!isValidPrefix) return "invalid";
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

CHARACTER (every slide — MUST be a fully detailed SVG robot mascot):

Every slide MUST have a unique, richly drawn inline SVG robot character placed at top-right corner.
The SVG MUST be position:absolute; top:12px; right:12px; z-index:16; width:110px; height:140px; overflow:visible

Build the robot using these EXACT SVG parts — all coordinates are relative to a 110×140 viewBox:

HEAD: <rect x="25" y="10" width="60" height="52" rx="10" ry="10" fill="#0d0d1a" stroke="ACCENT" stroke-width="2"/>
EYES: Two glowing circles — left <circle cx="42" cy="34" r="8" fill="ACCENT" opacity="0.9"/> right <circle cx="68" cy="34" r="8" fill="ACCENT" opacity="0.9"/>
EYE PUPILS: Dark inner circles — <circle cx="42" cy="34" r="4" fill="#000"/> <circle cx="68" cy="34" r="4" fill="#000"/>
EYE GLOW FILTER: Use a <filter id="eyeGlow-slideN"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter> and apply filter="url(#eyeGlow-slideN)" to eye circles
ANTENNA: <line x1="55" y1="10" x2="55" y2="2" stroke="ACCENT" stroke-width="2"/> + <circle cx="55" cy="2" r="3" fill="ACCENT"/>
MOUTH: A small LCD display strip — <rect x="35" y="50" width="40" height="10" rx="3" fill="#000" stroke="ACCENT" stroke-width="1"/> with 3 tiny rect "teeth" inside in ACCENT color
NECK: <rect x="48" y="62" width="14" height="10" fill="#0d0d1a" stroke="ACCENT" stroke-width="1.5"/>
BODY: <rect x="18" y="72" width="74" height="52" rx="8" ry="8" fill="#0d0d1a" stroke="ACCENT" stroke-width="2"/>
CHEST DISPLAY (inside body): <rect x="28" y="80" width="54" height="28" rx="4" fill="#000" stroke="ACCENT" stroke-width="1"/>
CHEST TEXT: 1–2 lines of text inside chest display, font: Share Tech Mono, font-size: 5px, fill: ACCENT, related to the slide topic — e.g. "AI NEWS" or "GPT-5" or topic keyword
CHEST SCANLINE: A thin repeating-linear-gradient scanline overlay rect on top of chest: <rect x="28" y="80" width="54" height="28" rx="4" fill="url(#scan-slideN)" opacity="0.4"/>
  Define: <pattern id="scan-slideN" width="1" height="3" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="ACCENT" opacity="0.15"/></pattern>
LEFT ARM: <rect x="2" y="76" width="16" height="36" rx="6" fill="#0d0d1a" stroke="ACCENT" stroke-width="1.5"/>
LEFT HAND: <circle cx="10" cy="116" r="7" fill="#0d0d1a" stroke="ACCENT" stroke-width="1.5"/>
RIGHT ARM: <rect x="92" y="76" width="16" height="36" rx="6" fill="#0d0d1a" stroke="ACCENT" stroke-width="1.5"/>
RIGHT HAND: <circle cx="100" cy="116" r="7" fill="#0d0d1a" stroke="ACCENT" stroke-width="1.5"/>
LEGS: Two rects — left <rect x="28" y="124" width="20" height="16" rx="4" fill="#0d0d1a" stroke="ACCENT" stroke-width="1.5"/> right <rect x="62" y="124" width="20" height="16" rx="4" fill="#0d0d1a" stroke="ACCENT" stroke-width="1.5"/>
FEET: Two rounded rects — <rect x="24" y="136" width="28" height="8" rx="4" fill="ACCENT" opacity="0.8"/> <rect x="58" y="136" width="28" height="8" rx="4" fill="ACCENT" opacity="0.8"/>

AMBIENT GLOW behind robot: <ellipse cx="55" cy="80" rx="48" ry="60" fill="ACCENT" opacity="0.05" filter="url(#eyeGlow-slideN)"/>

ANIMATIONS — apply to the whole SVG wrapper <g> element:
  float: @keyframes floatN { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-11px)} } animation: floatN 4s ease-in-out infinite
  glitch (every 5s): @keyframes glitchN { 0%,90%,100%{filter:none} 92%{filter:drop-shadow(-2px 0 #f00) drop-shadow(2px 0 #0ff)} 95%{filter:drop-shadow(2px 0 #f00) drop-shadow(-2px 0 #0ff)} } animation: glitchN 5s infinite

IMPORTANT RULES:
- Use a UNIQUE filter id, pattern id, and animation name per slide (e.g. eyeGlow-slide1, scan-slide2, float3, glitch4)
- Replace ACCENT in all fill/stroke values with the actual hex accent color for that slide
- The robot must be fully drawn — DO NOT use placeholder comments or simplified shapes
- Every slide must have a DIFFERENT pose or accessory (slide 1: antenna spark, slide 2: pointing arm, slide 3: holding a chip, slide 4: raised fist, slide 5: waving)
- The robot dimensions must stay within the 110×140 viewBox

Z-INDEX STACK — MUST be exact:
  grid/blob=1 | vignette=7 | scanlines=8 | sweep=9 |
  corners=13 | all text/content=14 | bottom-bar=15 |
  characters=16 | nav-buttons=20

ACCENT COLORS:
  AI/OpenAI/Gemini/LLMs → #8c64ff
  Microsoft/Azure        → #0078d7
  Google/Search/Android  → #4285f4
  Hardware/NASA/Chips    → #c8a000
  GitHub/Open Source     → #50c83c
  Finance/IPO/Markets    → #c8a000
  Jobs/Layoffs           → #dc2850
  Space/Deep Tech        → #00ffb4
  Cover slide            → #00ffb4

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
 * Two-stage Google Gemini request flow.
 * Stage 1: Call Gemini with Google Search tool enabled to fetch verified news.
 * Stage 2: Call Gemini in JSON mode with system prompt to output the formatted carousel.
 */
export async function runAgentLoop(onLog) {
  const keyStatus = getApiKeyStatus();
  if (keyStatus === "missing") throw new Error("API key is missing. Add VITE_GEMINI_API_KEY to your .env file or Vercel environment variables.");
  if (keyStatus === "invalid") throw new Error("API key looks invalid — it should start with 'AIzaSy'. Please check your key.");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  // ── STAGE 1: NEWS SEARCH & GROUNDING ──────────────────────
  onLog("🔍 Querying Google Search grounding for latest IT/AI news...");

  const searchPayload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Today is ${today}. Use Google Search to find the TOP 5 biggest global IT and AI breaking news stories from the PAST 7 DAYS. Run multiple search queries as needed. For each story, you MUST retrieve:
1. Title
2. Publication Date
3. Source Name (Publisher)
4. Brief summary of the story (1-2 sentences)
5. Exact URL of the source article

Return this verified news data in a clear list format.`
          }
        ]
      }
    ],
    tools: [
      {
        google_search: {}
      }
    ]
  };

  const searchRes = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(searchPayload),
    },
    TIMEOUT_MS
  );

  if (!searchRes.ok) {
    const body = await searchRes.text().catch(() => "");
    if (searchRes.status === 400) throw new Error(`Bad request (400): ${body}`);
    if (searchRes.status === 403) throw new Error("Forbidden (403): Check if your Gemini API key is valid and has access to the model.");
    if (searchRes.status === 429) throw new Error("Rate limit hit (429). Wait a moment and try again.");
    throw new Error(`Gemini search API error ${searchRes.status}: ${body}`);
  }

  const searchData = await searchRes.json();
  if (searchData.error) throw new Error(searchData.error.message);

  const searchResultText = searchData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!searchResultText) {
    throw new Error("Failed to retrieve grounded news stories from Google Search. Please try again.");
  }

  onLog("✅ Grounded news stories retrieved successfully.");
  onLog("🎨 Rendering Glitch Cyberpunk HTML Carousel using Gemini JSON Mode...");

  // ── STAGE 2: CAROUSEL HTML & JSON GENERATION ──────────────
  const renderPayload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Here is the verified news data from this week's search:

${searchResultText}

Now, generate the complete Glitch Cyberpunk LinkedIn carousel HTML and JSON object exactly as specified in the system instructions. Ensure that:
- You include all 5 stories with matching titles, source links, dates, and correct slides.
- Generate valid SVGs for each slide.
- Return ONLY the raw JSON object. Do NOT wrap it in backticks or markdown formatting.`
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: SYSTEM_PROMPT
        }
      ]
    },
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const renderRes = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(renderPayload),
    },
    TIMEOUT_MS
  );

  if (!renderRes.ok) {
    const body = await renderRes.text().catch(() => "");
    if (renderRes.status === 429) throw new Error("Rate limit hit (429). Wait a moment and try again.");
    throw new Error(`Gemini render API error ${renderRes.status}: ${body}`);
  }

  const renderData = await renderRes.json();
  if (renderData.error) throw new Error(renderData.error.message);

  const renderResultText = renderData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!renderResultText) {
    throw new Error("Failed to generate carousel data from Gemini. Please try again.");
  }

  onLog("✅ Carousel structure and HTML successfully generated!");
  return renderResultText;
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
