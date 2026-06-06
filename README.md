# ⚡ Tech Flash Weekly — LinkedIn Carousel Generator

One-click app that searches for this week's top 5 global IT & AI news stories
and generates a ready-to-screenshot **Glitch Cyberpunk** LinkedIn carousel.

---

## Features

- 🔍 Live web search — always fetches the latest breaking news
- 🗞️ 5 equal-priority global stories per carousel
- 🔗 Source link chip on every slide — readers can verify the article
- 🎨 Glitch Cyberpunk style with unique SVG cartoon per slide
- 📐 540×540px LinkedIn-optimised output
- ⬇️ One-click HTML download + LinkedIn caption ready to copy

---

## Step 1 — Get Your Google Gemini API Key

1. Go to **https://aistudio.google.com/**
2. Sign up or log in (free tier works)
3. Click **Get API key** → **Create API key** → copy the key

Keep this key private — never share it or commit it to Git.

---

## Step 2 — Run Locally

```bash
# Install dependencies
npm install

# Create your .env file
# Open .env and paste your real key:
# VITE_GEMINI_API_KEY=AIzaSy-your-actual-key-here

# Start the dev server
npm run dev
```

Open **http://localhost:5173**

---

## Step 3 — Deploy to Vercel (free)

### Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tech-flash-weekly.git
git push -u origin main
```

> Do NOT push your `.env` file — it is already in `.gitignore`.

### Add to Vercel

1. Go to **https://vercel.com** → sign up free with GitHub
2. Click **Add New Project** → select `tech-flash-weekly`
3. Before deploying, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `VITE_GEMINI_API_KEY` | `AIzaSy-your-actual-key-here` |

4. Click **Deploy** — live in ~30 seconds ✅

Every `git push` to `main` auto-redeploys.

---

## Project Structure

```
tech-flash-weekly/
├── .env.example       ← Copy to .env, add your key (never commit .env)
├── .gitignore         ← .env already excluded
├── index.html
├── vite.config.js
├── vercel.json
├── package.json
└── src/
    ├── main.jsx       ← React root
    ├── App.jsx        ← Full UI + all components
    ├── api.js         ← API key, agent loop, JSON extractor
    └── index.css      ← Global styles + fonts
```

---

## Weekly Workflow

```
Every Monday:
1. Open your Vercel URL
2. Click ⚡ GENERATE THIS WEEK'S CAROUSEL  (~30 sec)
3. Review stories — click READ ARTICLE to verify each one
4. Copy LinkedIn caption
5. Download HTML → screenshot each slide → post on LinkedIn
```
