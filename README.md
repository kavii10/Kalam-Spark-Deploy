# Kalam Spark 🚀

> **AI-powered career mentoring platform** — personalized roadmaps, spaced-repetition learning, mentor chat, and document intelligence, all in one app.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Project Structure](#project-structure)
4. [Tech Stack](#tech-stack)
5. [Local Development](#local-development)
6. [Deploying to Render (Frontend Only)](#deploying-to-render-frontend-only)

---

## Overview

Kalam Spark helps students discover their dream careers and build actionable, AI-generated roadmaps. It combines web-crawled industry data with Cloud-based Gemma 4 LLMs (OpenRouter, Groq, Gemini) to produce personalised 4-stage learning plans, then layers on spaced-repetition revision, an AI mentor chat, podcast generation from documents, and a live opportunity radar.

The app uses a **100% Login-Free** architecture, allowing users to jump straight into discovering their dream career.

**Deployment model (100% Free Tier):**
- **Frontend** → Vercel (React + Vite)
- **Backend** → Render (FastAPI)

---

## Features

| Module | Description |
|---|---|
| **Roadmap Generator** | Crawls career sites via Crawl4AI → Cloud Gemma 4 LLM → 4-stage roadmap |
| **Daily Planner** | AI-generated tasks, Pomodoro timer, XP & streak tracking |
| **Revision Engine** | FSRS + Ebisu spaced-repetition for tasks and flashcards |
| **AI Mentor Chat** | Multimodal chat (text + image) powered by Gemini + Gemma 4 |
| **File Speaker** | Upload PDF/DOCX/URL → summarise, quiz, or generate a podcast |
| **Opportunity Radar** | Scans internships, competitions, and courses for your career path |
| **Career Pivot** | Analyses skill gap between current dream and a new career target |
| **Resources Hub** | YouTube, books, news, and articles curated by AI |

---

## Project Structure

```
kalam-spark/                    ← repo root
│
├── frontend/                   ← React + Vite app
│   ├── index.html
│   ├── index.tsx               ← React entry point
│   ├── App.tsx                 ← Router + layout shell
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example            ← copy → .env and fill values
│   │
│   ├── views/                  ← Page-level components
│   │   ├── Onboarding.tsx      ← Guest login / Profile creation
│   │   ├── Dashboard.tsx
│   │   ├── RoadmapView.tsx
│   │   ├── Planner.tsx
│   │   ├── RevisionEngine.tsx
│   │   ├── MentorChat.tsx
│   │   ├── FileSpeaker.tsx
│   │   ├── Opportunities.tsx
│   │   ├── Resources.tsx
│   │   ├── CareerPivot.tsx
│   │   ├── DreamDiscovery.tsx  ← AI Career Quiz
│   │   ├── AppTour.tsx
│   │   └── PomodoroTimer.tsx
│   │
│   ├── geminiService.ts        ← API calls to backend & Gemini
│   ├── resourceApiService.ts   ← YouTube / Books / News
│   ├── flashcardService.ts     ← Flashcard CRUD + FSRS
│   ├── taskRevisionService.ts  ← Task revision + FSRS
│   ├── fsrsService.ts          ← FSRS algorithm
│   ├── ebisuService.ts         ← Ebisu Bayesian model
│   ├── rewardService.ts        ← XP + streak
│   ├── i18n.ts                 ← Internationalisation
│   └── types.ts                ← Shared TypeScript types
│
├── backend/                    ← FastAPI
│   ├── main.py                 ← All API routes
│   ├── crawler.py              ← Crawl4AI web scraper
│   ├── llm_service.py          ← Cloud LLM Router (OpenRouter/Groq/Gemini)
│   ├── file_speaker.py         ← Document RAG + podcast
│   ├── cache.py                ← File-based roadmap cache
│   ├── requirements.txt
│   └── .env.example
│
├── database/
│   └── schema.sql              ← Run once in Supabase SQL Editor
│
├── README.md
├── TECHNICAL_DOCUMENTATION.md
└── .gitignore
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Lucide React |
| **Auth / DB** | LocalStorage (Zero-Login Architecture) |
| **AI (cloud)** | Multi-platform LLM Router (OpenRouter, Groq, Gemini) |
| **Web crawl** | Crawl4AI + Playwright (Chromium) |
| **RAG** | ChromaDB + sentence-transformers |
| **TTS** | Edge-TTS (Microsoft Neural voices) |
| **Spaced rep** | ts-fsrs, ebisu-js |

---

## Local Development

### Prerequisites

- **Node.js** ≥ 18
- **Python** 3.10+
- **API Keys** from OpenRouter, Groq, and Gemini (for the backend `.env`)

### 1. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy env file and fill values
cp .env.example .env

# Start dev server
npm run dev
# → http://localhost:3000
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser
playwright install chromium

# Start API server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# → http://localhost:8000/docs
```

### 3. Database

Kalam Spark now uses a zero-login architecture storing state completely locally (`localStorage`), meaning **no database setup is required** to run the app.

---

## Free Deployment (Vercel & Render)

See **[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)** for the complete guide on how to host this application entirely for free on Vercel (Frontend) and Render (Backend).
