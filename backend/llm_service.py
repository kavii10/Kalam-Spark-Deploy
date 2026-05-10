"""
llm_service.py - Cloud LLM integration for Kalam Spark
Uses Gemma 4 (April 2026 release) across all platforms with auto-failover.
Platform priority: OpenRouter -> Groq -> Gemini AI Studio
"""

import json
import os
import re
import httpx
from typing import Optional

# ── API Keys (from environment variables)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
GROQ_API_KEY       = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")

# ── Gemma 4 (April 2026) model IDs
# OpenRouter: using user-requested gemma-4-31b-it
OPENROUTER_MODEL    = "google/gemma-4-31b-it:free"   # Gemma 4 31B — April 2026
OPENROUTER_FALLBACK = "google/gemma-4-26b-a4b-it:free" # Gemma 4 26B A4B fallback
GROQ_MODEL          = "llama-3.1-8b-instant"         # Groq (Gemma decommissioned, using Llama)
GEMINI_MODEL        = "gemini-2.0-flash"             # Gemini AI Studio: Flash model

# Language name map
LANGUAGE_NAMES = {
    "en": "English", "ta": "Tamil", "hi": "Hindi",
    "te": "Telugu", "kn": "Kannada", "ml": "Malayalam",
    "bn": "Bengali", "mr": "Marathi",
}


# ──────────────────────────────────────────────
# Core: Call cloud LLM with auto-failover
# OpenRouter → Groq → Gemini
# ──────────────────────────────────────────────
async def _call_llm(prompt: str, max_tokens: int = 3000, temperature: float = 0.3, json_mode: bool = False) -> str:
    """Try OpenRouter first, then Groq, then Gemini. Returns raw text response."""

    # ── 1. OpenRouter (Gemma 27B)
    if OPENROUTER_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://kalam-spark.onrender.com",
                "X-Title": "Kalam Spark",
            }
            body = {
                "model": OPENROUTER_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if json_mode:
                body["response_format"] = {"type": "json_object"}

            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=body)
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"].strip()
                print(f"[LLM] OpenRouter ✓ ({len(text)} chars)")
                return text
        except Exception as e:
            print(f"[LLM] OpenRouter (27B) failed: {e} — trying fallback (9B)...")
            try:
                body["model"] = OPENROUTER_FALLBACK
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=body)
                    resp.raise_for_status()
                    text = resp.json()["choices"][0]["message"]["content"].strip()
                    print(f"[LLM] OpenRouter fallback ✓ ({len(text)} chars)")
                    return text
            except Exception as fallback_e:
                print(f"[LLM] OpenRouter fallback failed: {fallback_e} — trying Groq...")

    # ── 2. Groq (Gemma 9B — very fast)
    if GROQ_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            }
            body = {
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": min(max_tokens, 8000),
                "temperature": temperature,
            }
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=body)
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"].strip()
                print(f"[LLM] Groq ✓ ({len(text)} chars)")
                return text
        except Exception as e:
            print(f"[LLM] Groq failed: {e} — trying Gemini...")

    # ── 3. Gemini (gemma-3-27b-it via AI Studio)
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
            generation_config = {"maxOutputTokens": max_tokens, "temperature": temperature}
            if json_mode:
                # Gemini: pass response_mime_type
                generation_config["responseMimeType"] = "application/json"

            body = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": generation_config,
            }
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(url, json=body)
                resp.raise_for_status()
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                print(f"[LLM] Gemini ✓ ({len(text)} chars)")
                return text
        except Exception as e:
            print(f"[LLM] Gemini failed: {e}")

    raise RuntimeError("All AI providers failed. Please check your API keys in the .env file.")


async def _call_llm_chat(messages: list[dict], max_tokens: int = 1500, temperature: float = 0.7, 
                        attachment_b64: str = "", attachment_type: str = "") -> str:
    """Chat variant: accepts a list of {role, content} messages. Supports multimodal image attachments."""

    # ── 1. OpenRouter
    if OPENROUTER_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://kalam-spark.onrender.com",
                "X-Title": "Kalam Spark",
            }
            
            # Prepare messages, injecting image into the last user message if present
            processed_messages = []
            for i, m in enumerate(messages):
                if i == len(messages) - 1 and m["role"] == "user" and attachment_b64 and attachment_type.startswith("image/"):
                    processed_messages.append({
                        "role": "user",
                        "content": [
                            {"type": "text", "text": m["content"]},
                            {"type": "image_url", "image_url": {"url": f"data:{attachment_type};base64,{attachment_b64}"}}
                        ]
                    })
                else:
                    processed_messages.append(m)

            body = {
                "model": OPENROUTER_MODEL,
                "messages": processed_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=body)
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"].strip()
                print(f"[LLM] OpenRouter chat ✓ ({len(text)} chars)")
                return text
        except Exception as e:
            print(f"[LLM] OpenRouter chat (27B) failed: {e} — trying fallback (9B)...")
            try:
                # Fallback doesn't support images usually on free tier, but we'll try
                body["model"] = OPENROUTER_FALLBACK
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=body)
                    resp.raise_for_status()
                    text = resp.json()["choices"][0]["message"]["content"].strip()
                    print(f"[LLM] OpenRouter chat fallback ✓ ({len(text)} chars)")
                    return text
            except Exception as fallback_e:
                print(f"[LLM] OpenRouter chat fallback failed: {fallback_e} — trying Groq...")

    # ── 2. Groq (Text only)
    if GROQ_API_KEY and not attachment_b64:
        try:
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            }
            body = {
                "model": GROQ_MODEL,
                "messages": messages,
                "max_tokens": min(max_tokens, 8000),
                "temperature": temperature,
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=body)
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"].strip()
                print(f"[LLM] Groq chat ✓ ({len(text)} chars)")
                return text
        except Exception as e:
            print(f"[LLM] Groq chat failed: {e} — trying Gemini...")

    # ── 3. Gemini (Multimodal support)
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
            
            # Construct contents list
            contents = []
            for i, m in enumerate(messages):
                role = "user" if m["role"] == "user" else "model"
                parts = [{"text": m["content"]}]
                
                # If last user message and has image, add image part
                if i == len(messages) - 1 and m["role"] == "user" and attachment_b64 and attachment_type.startswith("image/"):
                    parts.append({
                        "inlineData": {
                            "mimeType": attachment_type,
                            "data": attachment_b64
                        }
                    })
                
                contents.append({"role": role, "parts": parts})

            body = {
                "contents": contents,
                "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(url, json=body)
                resp.raise_for_status()
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                print(f"[LLM] Gemini multimodal chat ✓ ({len(text)} chars)")
                return text
        except Exception as e:
            print(f"[LLM] Gemini chat failed: {e}")

    raise RuntimeError("All AI providers failed. Please check your API keys in the .env file.")


# ──────────────────────────────────────────────
# JSON Schema for the roadmap
# ──────────────────────────────────────────────
ROADMAP_SCHEMA = """
{
  "dream": "Career title",
  "summary": "3-4 sentence inspiring and detailed roadmap summary",
  "stages": [
    {
      "id": "stage-1",
      "title": "Stage 1 Title (specific to career)",
      "description": "Comprehensive explanation of what to learn and why in this stage.",
      "duration": "X-Y weeks",
      "subjects": ["Topic 1", "Tool 2", "Concept 3", "Topic 4", "Topic 5", "Tool 6", "Topic 7", "Concept 8"],
      "skills": ["Specific Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5", "Skill 6"],
      "projects": ["Detailed project idea 1", "Detailed project idea 2", "Project 3"],
      "resources": []
    }
  ]
}
"""


def _build_prompt(dream: str, year: str, branch: str, crawled_content: str, language: str = "en") -> str:
    context_section = ""
    if crawled_content and len(crawled_content) > 50:
        context_section = f"\nREAL DATA FROM CAREER WEBSITES:\n---\n{crawled_content[:12000]}\n---\n"
    else:
        context_section = "(No web data — use your extensive knowledge to create an accurate roadmap.)"

    lang_name = LANGUAGE_NAMES.get(language, "English")
    language_instruction = (
        f"\nIMPORTANT: Write ALL roadmap content in {lang_name}. Keep JSON keys in English but all values in {lang_name}."
        if language != "en" else ""
    )

    return f"""You are an elite career mentor. Create a HIGHLY SPECIFIC, DETAILED 4-stage career roadmap.{language_instruction}

STUDENT PROFILE:
- Dream Career: {dream}
- Education Level: {year}
- Current Field: {branch}

{context_section}

INSTRUCTIONS:
1. Exactly 4 progressive stages from beginner to hirable professional.
2. Each stage: 8-10 subjects, 6 skills, 3 projects, detailed description.
3. Use REAL technology names, tools, frameworks specific to {dream}.
4. Durations realistic for a {year} student working part-time.

Return ONLY valid JSON matching this EXACT schema (no markdown, no code blocks):
{ROADMAP_SCHEMA}"""


def _parse_roadmap_json(raw: str, dream: str) -> Optional[dict]:
    if not raw or len(raw.strip()) < 10:
        return None
    try:
        parsed = json.loads(raw.strip())
        if isinstance(parsed, dict) and "stages" in parsed and len(parsed["stages"]) > 0:
            return parsed
    except json.JSONDecodeError:
        pass
    json_match = re.search(r'\{[\s\S]*\}', raw)
    if json_match:
        try:
            parsed = json.loads(json_match.group(0))
            if isinstance(parsed, dict) and "stages" in parsed:
                return parsed
        except json.JSONDecodeError:
            pass
    print(f"[LLM] Failed to parse JSON. Raw (first 300): {raw[:300]}")
    return None


def _normalize_stage(stage: dict, index: int) -> dict:
    def to_list(val) -> list:
        if not val: return []
        if isinstance(val, list): return [str(v).strip() for v in val if v]
        if isinstance(val, str): return [v.strip() for v in re.split(r'[,;|\n]', val) if v.strip()]
        return []
    return {
        "id": stage.get("id") or f"stage-{index + 1}",
        "title": stage.get("title") or f"Stage {index + 1}",
        "description": stage.get("description") or "",
        "duration": stage.get("duration") or "8-12 weeks",
        "subjects": to_list(stage.get("subjects")),
        "skills": to_list(stage.get("skills")),
        "projects": to_list(stage.get("projects")),
        "resources": stage.get("resources") if isinstance(stage.get("resources"), list) else [],
    }


async def generate_roadmap(dream: str, year: str, branch: str, crawled_content: str, language: str = "en") -> dict:
    """Generate a career roadmap using cloud Gemma4 (OpenRouter → Groq → Gemini)."""
    prompt = _build_prompt(dream, year, branch, crawled_content, language)
    print(f"[LLM] Sending roadmap prompt ({len(prompt)} chars)...")

    raw_response = await _call_llm(prompt, max_tokens=3500, temperature=0.15, json_mode=True)
    parsed = _parse_roadmap_json(raw_response, dream)

    if not parsed:
        raise RuntimeError("LLM returned invalid JSON. Please try again.")

    roadmap = {
        "dream": parsed.get("dream") or dream,
        "summary": parsed.get("summary") or f"Your personalized roadmap to become a {dream}.",
        "stages": [_normalize_stage(s, i) for i, s in enumerate(parsed.get("stages", []))],
    }
    if not roadmap["stages"]:
        raise RuntimeError("LLM returned roadmap with no stages.")

    print(f"[LLM] Successfully generated roadmap with {len(roadmap['stages'])} stages")
    return roadmap


# ──────────────────────────────────────────────
# Smart Task Generation
# ──────────────────────────────────────────────
async def generate_tasks(dream: str, current_stage: str, subjects: list[str], count: int = 5) -> list[dict]:
    subjects_str = ", ".join(subjects) if subjects else dream
    prompt = f"""You are an expert educator. Create exactly {count} actionable daily tasks for a student studying to become a {dream}, currently at stage: '{current_stage}'.
Their current topics: {subjects_str}.

Tasks must be balanced: theory, hands-on, and review.
Return ONLY valid JSON array with exactly {count} objects:
[{{"title": "Specific actionable task", "type": "theory|hands-on|review"}}]"""

    try:
        raw = await _call_llm(prompt, max_tokens=800, temperature=0.2, json_mode=True)
        try:
            parsed = json.loads(raw.strip())
        except json.JSONDecodeError:
            match = re.search(r'\[[\s\S]*\]', raw)
            parsed = json.loads(match.group(0)) if match else []
        if isinstance(parsed, list) and len(parsed) > 0:
            print(f"[LLM] Generated {len(parsed)} smart tasks")
            return parsed
    except Exception as e:
        print(f"[LLM] Failed to generate smart tasks: {e}")
    return []


# ──────────────────────────────────────────────
# Smart Quiz Generation
# ──────────────────────────────────────────────
async def generate_quiz(subject: str, tasks: list[str], stage_desc: str = "", stage_concepts: list[str] = []) -> list[dict]:
    tasks_str = ", ".join(tasks) if tasks else ""
    concepts_str = ", ".join(stage_concepts) if stage_concepts else ""
    
    import random
    prompt = f"""You are an expert academic examiner. Create EXACTLY 5 high-quality, unique multiple-choice questions.

CONTEXT:
- Career Goal: {subject}
- Stage Focus: {stage_desc[:500]}
- Key Concepts: {concepts_str}
- Recent Tasks: {tasks_str}

STRICT GUIDELINES:
1. Questions MUST be deeply specific to {subject} and the current stage focus.
2. DO NOT use generic questions. Create scenarios that a professional in {subject} would face.
3. Ensure high variety. Do not repeat topics within the 5 questions.
4. Each question must have 4 distinct options.
5. Return ONLY a valid JSON array.

Unique Session Token: {random.randint(1000, 999999)}

FORMAT:
[{{
  "question": "Specific question about {concepts_str or subject}?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Detailed professional explanation of why this answer is correct."
}}]"""

    try:
        raw = await _call_llm(prompt, max_tokens=1500, temperature=0.6, json_mode=True)
        raw = raw.strip()
        if raw.startswith('```'):
            raw = re.sub(r'^```[a-zA-Z]*\n', '', raw)
            raw = re.sub(r'\n```$', '', raw).strip()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r'\[[\s\S]*\]', raw)
            parsed = json.loads(match.group(0)) if match else []
        if isinstance(parsed, list) and len(parsed) >= 1:
            print(f"[LLM] Generated {len(parsed)} quiz questions")
            return parsed[:5]
    except Exception as e:
        print(f"[LLM] Failed to generate quiz: {e}")
    raise RuntimeError("Failed to generate quiz.")


# ──────────────────────────────────────────────
# AI Mentor Chat
# ──────────────────────────────────────────────
async def chat_mentor(user_profile: dict, messages: list[dict], new_message: str,
                      attachment_base64: str = "", attachment_type: str = "", language: str = "en") -> str:
    dream = user_profile.get("dream", "a great career")
    year = user_profile.get("year", "student")
    branch = user_profile.get("branch", "general studies")
    stage_idx = user_profile.get("currentStageIndex", 0) + 1
    lang_name = LANGUAGE_NAMES.get(language, "English")

    language_instruction = (
        f"\nIMPORTANT: Always respond in {lang_name} language."
        if language != "en" else ""
    )

    system_prompt = f"""You are Kalam Spark, a friendly and encouraging AI career mentor.
Student: {user_profile.get('name', 'Student')}, Dream: {dream}, Education: {year}, Branch: {branch}, Stage: {stage_idx}.{language_instruction}

- Be warm and supportive. 
- Respond NATURALLY to simple greetings (say hello back — do NOT generate a huge roadmap).
- Keep responses focused and practical (2-3 paragraphs max).
- Never use markdown headers. Use **bold** for emphasis."""

    chat_messages = [{"role": "system", "content": system_prompt}]

    for msg in messages:
        if "role" in msg and "text" in msg:
            role = "assistant" if msg["role"] == "ai" else "user"
            chat_messages.append({"role": role, "content": msg["text"]})

    content = new_message
    att_b64 = ""
    att_type = ""

    if attachment_base64:
        if attachment_type == "text":
            content = f"[Attached document]:\n{attachment_base64[:6000]}\n\n---\nUser: {new_message}"
        elif attachment_type.startswith("image/") or attachment_type.startswith("video/"):
            # video frames are sent as image/jpeg from frontend
            att_b64 = attachment_base64
            att_type = attachment_type
            if not content: content = "Please analyze this image."

    chat_messages.append({"role": "user", "content": content})

    try:
        reply = await _call_llm_chat(chat_messages, max_tokens=1500, temperature=0.7, 
                                     attachment_b64=att_b64, attachment_type=att_type)
        print(f"[LLM] Chat mentor response: {len(reply)} chars")
        return reply
    except Exception as e:
        print(f"[LLM] Chat mentor failed: {e}")
        raise


# ──────────────────────────────────────────────
# Career Pivot Analysis
# ──────────────────────────────────────────────
async def analyze_career_pivot(current_dream: str, new_dream: str, branch: str, year: str, current_skills: str) -> dict:
    prompt = f"""You are a Career Transition Architect with deep knowledge of the Indian job market.

A student wants to pivot:
- Current Goal: "{current_dream}"
- New Goal: "{new_dream}"
- Branch: "{branch or 'Not specified'}"
- Education: "{year or 'Student'}"
- Current Skills: "{current_skills or 'General academic knowledge'}"

Return ONLY valid JSON (no markdown):
{{
  "transferPercentage": <integer 0-100>,
  "transferableSkills": ["skill1", "skill2", "skill3"],
  "biggestGap": "1-2 sentences on main missing knowledge",
  "marketDemand": "1 sentence about job demand for {new_dream} in India 2025",
  "timeToTransition": "realistic estimate like '6-9 months with focused effort'",
  "bridgePlan": [
    {{"title": "Step 1", "action": "Specific 2-3 sentence advice with course names/platforms"}},
    {{"title": "Step 2", "action": "Specific actionable advice"}},
    {{"title": "Step 3", "action": "Networking/portfolio/job search advice"}}
  ]
}}"""

    try:
        raw = await _call_llm(prompt, max_tokens=1200, temperature=0.25, json_mode=True)
        if raw.startswith('```'):
            raw = re.sub(r'^```[a-zA-Z]*\n', '', raw)
            raw = re.sub(r'\n```$', '', raw).strip()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r'\{[\s\S]*\}', raw)
            parsed = json.loads(match.group(0)) if match else None

        required = ["transferPercentage", "transferableSkills", "bridgePlan"]
        if parsed and isinstance(parsed, dict) and all(k in parsed for k in required):
            print(f"[LLM] Career pivot: {parsed.get('transferPercentage')}% transfer")
            return parsed
    except Exception as e:
        print(f"[LLM] Career pivot failed: {e}")

    return {
        "transferPercentage": 45,
        "transferableSkills": ["Problem Solving", "Research Skills", "Self-Learning"],
        "biggestGap": f"Transitioning from {current_dream} to {new_dream} requires specialized domain knowledge.",
        "marketDemand": f"{new_dream} roles are growing in India with increasing demand.",
        "timeToTransition": "6-12 months with consistent effort",
        "bridgePlan": [
            {"title": "Foundation Learning", "action": f"Start with free courses on NPTEL or Coursera covering core concepts of {new_dream}."},
            {"title": "Build Projects", "action": f"Create 2-3 portfolio projects demonstrating {new_dream} skills. Share on GitHub and LinkedIn."},
            {"title": "Network & Apply", "action": f"Join {new_dream} communities on LinkedIn, attend meetups, and apply on Internshala."}
        ]
    }


# ──────────────────────────────────────────────
# Opportunity Scanner
# ──────────────────────────────────────────────
async def generate_opportunities(dream: str, branch: str, year: str, current_skills: str, stage_index: int) -> list:
    PLATFORM_URLS = {
        "linkedin": f"https://www.linkedin.com/jobs/search/?keywords={dream.replace(' ', '+')}&location=India&f_E=1",
        "internshala": f"https://internshala.com/internships/{dream.lower().replace(' ', '-')}-internship",
        "naukri": f"https://www.naukri.com/{dream.lower().replace(' ', '-')}-jobs",
        "unstop": f"https://unstop.com/hackathons?search={dream.replace(' ', '+')}",
        "devpost": f"https://devpost.com/hackathons?search={dream.replace(' ', '+')}",
        "sih": "https://www.sih.gov.in/",
        "freelancer": f"https://www.freelancer.in/jobs/{dream.lower().replace(' ', '-')}/",
        "google": f"https://www.google.com/search?q={dream.replace(' ', '+')}+internship+OR+hackathon+India+2025",
    }

    prompt = f"""You are an Opportunity Scanner AI for Indian students in 2025.

Student: Dream="{dream}", Branch="{branch or 'General'}", Level="{year or 'Student'}", Skills="{current_skills or 'General'}", Stage={stage_index + 1}

Find 6 realistic opportunities HIGHLY RELEVANT to the career "{dream}".
IMPORTANT: DO NOT suggest Hackathons, Freelance work, or Tech jobs if they are irrelevant to "{dream}" (e.g., for IAS Officer, Doctor, Lawyer). Instead, suggest appropriate alternatives like Fellowships, Government Internships, Training Programs, Mock Tests, or relevant Entry-Level Jobs.

Return ONLY a valid JSON array (no markdown):
[{{
  "type": "Internship|Job|Hackathon|Freelance|Fellowship|Training",
  "title": "specific title highly relevant to {dream}",
  "company": "real company/organization name",
  "location": "city or Remote or Pan India",
  "requiredSkills": ["skill1", "skill2", "skill3"],
  "matchPercentage": <integer 72-96>,
  "actionText": "Apply on [Platform]",
  "platform": "linkedin|internshala|naukri|unstop|sih|freelancer|devpost|other"
}}]"""

    try:
        raw = await _call_llm(prompt, max_tokens=1800, temperature=0.4, json_mode=True)
        raw = raw.strip()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r'\[[\s\S]*\]', raw)
            parsed = json.loads(match.group(0)) if match else None

        if isinstance(parsed, list) and len(parsed) > 0:
            for opp in parsed:
                platform = opp.get("platform", "google").lower()
                opp["searchUrl"] = PLATFORM_URLS.get(platform, PLATFORM_URLS["google"])
            print(f"[LLM] Generated {len(parsed)} opportunities")
            return parsed
        elif isinstance(parsed, dict):
            items = parsed.get("items", parsed.get("opportunities", []))
            if items:
                for opp in items:
                    opp["searchUrl"] = PLATFORM_URLS.get(opp.get("platform", "google"), PLATFORM_URLS["google"])
                return items
    except Exception as e:
        print(f"[LLM] Opportunity scan failed: {e}")

    return [
        {"type": "Internship", "title": f"{dream} Intern", "company": "Internshala Partner Companies", "location": "Remote / Pan India", "requiredSkills": [branch or "Communication", "Eagerness to Learn", "Domain Knowledge"], "matchPercentage": 85, "actionText": "Apply on Internshala", "platform": "internshala", "searchUrl": PLATFORM_URLS["internshala"]},
        {"type": "Hackathon", "title": "Smart India Hackathon 2025", "company": "Ministry of Education, Govt. of India", "location": "Pan India", "requiredSkills": ["Teamwork", "Innovation", "Problem Solving"], "matchPercentage": 90, "actionText": "Register on SIH Portal", "platform": "sih", "searchUrl": PLATFORM_URLS["sih"]},
        {"type": "Hackathon", "title": f"{dream} Innovation Challenge", "company": "Unstop Community", "location": "Online", "requiredSkills": ["Creativity", branch or "Research", "Presentation"], "matchPercentage": 88, "actionText": "Browse on Unstop", "platform": "unstop", "searchUrl": PLATFORM_URLS["unstop"]},
        {"type": "Job", "title": f"Entry-Level {dream}", "company": "Naukri Listed Startups", "location": "Bangalore / Delhi / Remote", "requiredSkills": ["Domain Knowledge", "Communication", "Problem Solving"], "matchPercentage": 78, "actionText": "Search on Naukri", "platform": "naukri", "searchUrl": PLATFORM_URLS["naukri"]},
        {"type": "Internship", "title": f"Junior {dream} Trainee", "company": "LinkedIn Partner Companies", "location": "India (Multiple Cities)", "requiredSkills": ["Fresher Friendly", "Domain Basics", "Communication"], "matchPercentage": 82, "actionText": "Apply on LinkedIn", "platform": "linkedin", "searchUrl": PLATFORM_URLS["linkedin"]},
        {"type": "Freelance", "title": f"Freelance {dream} Projects", "company": "Freelancer.in", "location": "Online", "requiredSkills": ["Portfolio", "Self-Management", "Communication"], "matchPercentage": 74, "actionText": "Browse Projects", "platform": "freelancer", "searchUrl": PLATFORM_URLS["freelancer"]},
    ]


# ──────────────────────────────────────────────
# Health check (no longer needs Ollama)
# ──────────────────────────────────────────────
async def check_ollama() -> dict:
    """Returns cloud AI status instead of Ollama."""
    providers = []
    if OPENROUTER_API_KEY:
        providers.append("OpenRouter")
    if GROQ_API_KEY:
        providers.append("Groq")
    if GEMINI_API_KEY:
        providers.append("Gemini")
    return {
        "running": len(providers) > 0,
        "model_available": len(providers) > 0,
        "model_name": "Gemma4 (Cloud)",
        "providers": providers,
        "mode": "cloud",
    }


# ──────────────────────────────────────────────
# Dream Discovery
# ──────────────────────────────────────────────
async def discover_dream_careers(interests: str, personality: str, language: str = "en") -> list:
    """Uses the AI model to suggest 12 career paths based on user answers."""
    # Main app uses English only for this feature
    prompt = f"""
You are an expert career counselor. The user has provided their interests and personality traits.
Based on this, suggest exactly 12 ideal career paths for them that are highly relevant to their background and interests.
Write the response in English.

Interests: {interests}
Personality traits / Answers: {personality}

Return ONLY a JSON array of 12 objects, each with 'dream' (career name) and 'subjects' (array of 3 key subjects/skills needed).
Format EXACTLY like this:
[
  {{"dream": "Career 1", "subjects": ["Skill 1", "Skill 2", "Skill 3"]}},
  ...
  {{"dream": "Career 12", "subjects": ["Skill 1", "Skill 2", "Skill 3"]}}
]
"""
    try:
        response = await _call_llm(prompt, max_tokens=1200, temperature=0.7, json_mode=True)
        # Try to parse the JSON array
        import json, re
        match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(response)
    except Exception as e:
        print(f"Error in discover_dream_careers: {e}")
        # Expanded fallback if AI fails completely
        return [
            {"dream": "Software Engineer", "subjects": ["Computer Science", "Logic", "Math"]},
            {"dream": "Data Scientist", "subjects": ["Statistics", "Programming", "Analysis"]},
            {"dream": "Product Manager", "subjects": ["Leadership", "Design", "Business"]},
            {"dream": "UI/UX Designer", "subjects": ["Visual Design", "User Research", "Prototyping"]},
            {"dream": "Digital Marketer", "subjects": ["SEO", "Content Strategy", "Analytics"]},
            {"dream": "Cybersecurity Analyst", "subjects": ["Network Security", "Cryptography", "Risk Assessment"]},
            {"dream": "Cloud Architect", "subjects": ["AWS/Azure", "DevOps", "Infrastructure"]},
            {"dream": "Business Analyst", "subjects": ["Data Modeling", "Requirements", "Communication"]},
            {"dream": "Full Stack Developer", "subjects": ["Frontend", "Backend", "Database"]},
            {"dream": "AI Engineer", "subjects": ["Machine Learning", "Neural Networks", "Python"]},
            {"dream": "Content Creator", "subjects": ["Storytelling", "Video Editing", "Marketing"]},
            {"dream": "Financial Analyst", "subjects": ["Accounting", "Investment", "Reporting"]}
        ]

async def generate_career_summary(dream: str, branch: str, year: str, language: str = "en") -> str:
    """Generate a highly specific 3-sentence career summary."""
    lang_name = LANGUAGE_NAMES.get(language, "English")
    prompt = f"""
A student wants to become a "{dream}". Their subject interest is "{branch}" and education level is "{year}".
Write a HIGHLY SPECIFIC career overview in exactly 3 sentences (plain text, NO markdown) in {lang_name}:
Sentence 1: Exactly what a {dream} IS (their unique role in society/industry).
Sentence 2: Their specific day-to-day work environment, tools, or activities.
Sentence 3: Their 2-3 most critical unique responsibilities.

STRICT RULE: Do NOT give generic "skilled professional" advice. The description MUST be deeply relevant to being a {dream}.
"""
    try:
        response = await _call_llm(prompt, max_tokens=600, temperature=0.3)
        return response.strip()
    except Exception as e:
        print(f"Error in generate_career_summary: {e}")
        # Career-specific fallbacks
        d = dream.lower()
        if "engineer" in d or "developer" in d:
            return f"A {dream} designs and builds technical solutions that solve complex real-world problems through code and logic. You will spend your days writing high-quality code, debugging systems, and collaborating with teams on platforms like GitHub. Your main duties include architecting software features, optimizing performance, and ensuring system reliability."
        if "doctor" in d or "health" in d:
            return f"A {dream} is a dedicated healthcare provider who diagnoses illnesses and promotes wellness in their community. Your daily work involves clinical examinations, analyzing patient data, and coordinating care with other medical professionals. Your core responsibilities are accurate diagnosis, treatment planning, and patient education."
        if "designer" in d or "artist" in d:
            return f"A {dream} transforms abstract ideas into compelling visual experiences that communicate meaning and inspire action. You will work daily with tools like Figma or Adobe Creative Cloud, conducting user research and iterating on design prototypes. Your key roles are creating intuitive interfaces, maintaining brand consistency, and solving visual problems."
        
        return f"A {dream} is a specialized professional who applies expert knowledge in {branch} to drive innovation and impact. Daily work involves using industry-specific tools to solve unique challenges and collaborating with peers to reach project goals. Your critical responsibilities include strategic planning, execution of core tasks, and delivering high-quality results."

