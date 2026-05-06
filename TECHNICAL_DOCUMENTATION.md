# Kalam Spark — Technical Documentation

**Version:** 1.0.0 | **Last updated:** April 2026

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│     Browser  →  Vercel Static Site      │
│     React + Vite (frontend/)            │
│                                         │
│  Auth  → LocalStorage (Zero-Login)      │
│  API   → https://your-backend.onrender  │
└──────────────────┬──────────────────────┘
                   │ HTTPS API calls
┌──────────────────▼──────────────────────┐
│     Render Web Service (backend/)       │
│     FastAPI  +  Cloud LLM Router        │
│     Crawl4AI  +  ChromaDB               │
│     Edge-TTS  +  PyMuPDF                │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│     Cloud AI Providers                  │
│     OpenRouter (Gemma 4 31B/26B)        │
│     Groq (Llama 3.1)                    │
│     Gemini AI Studio                    │
└─────────────────────────────────────────┘
```

---

## API Reference

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Returns backend status + Ollama connectivity |

### Roadmap

| Method | Path | Params / Body |
|---|---|---|
| GET | `/api/roadmap` | `dream`, `year`, `branch`, `force_refresh` |
| WS | `/ws/roadmap` | Same params — streams progress events |

### Planner

| Method | Path | Body |
|---|---|---|
| POST | `/api/tasks` | `{ dream, current_stage, subjects[] }` |
| POST | `/api/quiz` | `{ subject, tasks[] }` |

### Mentor Chat

| Method | Path | Body |
|---|---|---|
| POST | `/api/chat` | `{ user, messages[], new_message, attachment_base64?, attachment_type? }` |

### Career Pivot

| Method | Path | Body |
|---|---|---|
| POST | `/api/pivot` | `{ current_dream, new_dream, branch, year, current_skills }` |

### Opportunity Radar

| Method | Path | Body |
|---|---|---|
| POST | `/api/opportunities` | `{ dream, branch, year, current_skills, stage_index }` |

### Cache

| Method | Path | Query params |
|---|---|---|
| DELETE | `/api/cache` | `dream`, `year`, `branch` (all optional) |

### File Speaker

| Method | Path | Description |
|---|---|---|
| POST | `/api/filespeaker/upload` | Upload PDF/DOCX/TXT |
| POST | `/api/filespeaker/url` | Crawl a URL |
| POST | `/api/filespeaker/text` | Add pasted text |
| POST | `/api/filespeaker/chat` | RAG chat with documents |
| POST | `/api/filespeaker/transform` | Summary / key-concepts / flashcards |
| POST | `/api/filespeaker/podcast` | Generate AI podcast |
| POST | `/api/filespeaker/podcast/interact` | On-demand host response |
| GET | `/api/filespeaker/audio/{file}` | Serve generated MP3 |

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `VITE_BACKEND_URL` | ✅ | Render public URL (e.g. `https://kalam-spark-backend.onrender.com`) |
| `VITE_YOUTUBE_API_KEY` | optional | YouTube Data API v3 |
| `VITE_GOOGLE_BOOKS_API_KEY` | optional | Google Books API |
| `VITE_NYT_API_KEY` | optional | New York Times API |
| `VITE_NEWSDATA_API_KEY` | optional | NewsData.io |
| `VITE_GNEWS_API_KEY` | optional | GNews |
| `VITE_CURRENTS_API_KEY` | optional | Currents API |

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | | OpenRouter API Key |
| `GROQ_API_KEY` | | Groq API Key |
| `GEMINI_API_KEY` | | Gemini API Key |
| `ALLOWED_ORIGINS` | localhost | Comma-separated CORS origins (add your Vercel URL here) |

---

## Database Schema

Kalam Spark uses a **Zero-Login Architecture**. All data is stored directly in the user's browser via `localStorage` (as JSON). 
There is no longer a requirement to configure Supabase or PostgreSQL.

A future cross-device synchronization feature using a "6-Word Sync Code" is designed but currently relies on local storage by default.

---

## Deploying the Frontend to Vercel and Backend to Render

### Step 1 — Push to GitHub

```bash
git init          # if not already a git repo
git add .
git commit -m "Initial Kalam Spark release"
git remote add origin https://github.com/YOUR_USER/kalam-spark.git
git push -u origin main
```

### Step 2 — Deploy Backend to Render (Free)

1. Go to [Render.com](https://render.com) → **New +** → **Web Service**
2. Connect your GitHub repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `./build.sh`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables**:
   - `OPENROUTER_API_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
5. Click **Create Web Service**. 
6. Note your backend URL: `https://kalam-spark-backend.onrender.com`

### Step 3 — Deploy Frontend to Vercel (Free)

1. Go to [Vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repo.
3. Configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
4. Add **Environment Variables**:
   - `VITE_BACKEND_URL` = `https://kalam-spark-backend.onrender.com`
5. Click **Deploy**.
6. Note your frontend URL: `https://kalam-spark.vercel.app`

### Step 4 — Fix CORS

1. Go back to your backend dashboard on Render.
2. In the **Environment** tab, add:
   - `ALLOWED_ORIGINS` = `https://kalam-spark.vercel.app`
3. Save changes (Render will auto-restart the backend).

### Step 5 — Verify

| Check | URL |
|---|---|
| Frontend loads | `https://kalam-spark.vercel.app` |
| Backend reachable | `https://kalam-spark-backend.onrender.com/health` |
| API docs | `https://kalam-spark-backend.onrender.com/docs` |
| Roadmap generates | Enter a career dream |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| CORS error in browser | Add your Vercel frontend URL to `ALLOWED_ORIGINS` in backend |
| Blank page after deploy | Check your routing rules if not using Vercel default |
| All AI Providers Failed | Check your API keys in the Render environment variables and ensure quota isn't exceeded |
| Connection refused | Backend is likely asleep (Render free tier sleeps after 15 mins of inactivity) |

---

## Module Reference

| File | Purpose |
|---|---|
| `frontend/App.tsx` | Root router, layout shell |
| `frontend/geminiService.ts` | Gemini API + Cloud LLM routing |
| `frontend/flashcardService.ts` | Flashcard CRUD + FSRS scheduling |
| `frontend/taskRevisionService.ts` | Task revision CRUD + FSRS |
| `frontend/fsrsService.ts` | FSRS algorithm wrapper |
| `frontend/ebisuService.ts` | Ebisu Bayesian recall model |
| `frontend/rewardService.ts` | XP + streak calculation |
| `frontend/i18n.ts` | Internationalisation strings |
| `frontend/types.ts` | Shared TypeScript types |
| `backend/main.py` | FastAPI app + all route handlers |
| `backend/crawler.py` | Crawl4AI Playwright web scraper |
| `backend/llm_service.py` | Cloud LLM Router (OpenRouter/Groq/Gemini) |
| `backend/file_speaker.py` | Document RAG + podcast synthesis |
| `backend/cache.py` | JSON file-based roadmap cache |
