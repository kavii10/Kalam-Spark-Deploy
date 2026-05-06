"""
file_speaker.py — Kalam Spark File Speaker Engine

Features:
  1. Source ingestion — PDF, DOCX, TXT, MD, web URL, plain text paste
  2. RAG-powered "Chat with Documents" (ChromaDB + sentence-transformers + Cloud LLM)
  3. Transformations — Summary, Key Concepts, Takeaways, Questions, Flashcard Export
  4. Podcast generation — Gemma4 (cloud) multilingual dialogue + edge-tts audio
  5. Auto language detection
"""

import asyncio
import io
import json
import os
import re
import tempfile
import uuid
from pathlib import Path
from typing import Any, Optional

import httpx
from bs4 import BeautifulSoup

# ── Optional heavy deps — imported lazily so startup is fast
def _import_google_generativeai():
    import google.generativeai as genai
    return genai

# ── Storage paths
UPLOAD_DIR = Path(__file__).parent / "filespeaker_uploads"
AUDIO_DIR  = Path(__file__).parent / "filespeaker_audio"
UPLOAD_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)

# Cloud LLM helpers (OpenRouter → Groq → Gemini failover)
from llm_service import _call_llm, _call_llm_chat

# ─────────────────────────────────────────────────────────
# MULTILINGUAL VOICE MAP (language code → edge-tts voices)
# ─────────────────────────────────────────────────────────
LANGUAGE_VOICES: dict[str, dict] = {
    "en": {
        "host1": "en-US-ChristopherNeural",
        "host2": "en-US-JennyNeural",
        "name": "English",
        "rec_lang": "en-US",
    },
    "ta": {
        "host1": "ta-IN-ValluvarNeural",
        "host2": "ta-IN-PallaviNeural",
        "name": "Tamil",
        "rec_lang": "ta-IN",
    },
    "hi": {
        "host1": "hi-IN-MadhurNeural",
        "host2": "hi-IN-SwaraNeural",
        "name": "Hindi",
        "rec_lang": "hi-IN",
    },
    "te": {
        "host1": "te-IN-MohanNeural",
        "host2": "te-IN-ShrutiNeural",
        "name": "Telugu",
        "rec_lang": "te-IN",
    },
    "kn": {
        "host1": "kn-IN-GaganNeural",
        "host2": "kn-IN-SapnaNeural",
        "name": "Kannada",
        "rec_lang": "kn-IN",
    },
    "ml": {
        "host1": "ml-IN-MidhunNeural",
        "host2": "ml-IN-SobhanaNeural",
        "name": "Malayalam",
        "rec_lang": "ml-IN",
    },
    "bn": {
        "host1": "bn-IN-BashkarNeural",
        "host2": "bn-IN-TanishaaNeural",
        "name": "Bengali",
        "rec_lang": "bn-IN",
    },
    "mr": {
        "host1": "mr-IN-ManoharNeural",
        "host2": "mr-IN-AarohiNeural",
        "name": "Marathi",
        "rec_lang": "mr-IN",
    },
}

LANGUAGE_NAMES = {
    "en": "English", "ta": "Tamil", "hi": "Hindi",
    "te": "Telugu", "kn": "Kannada", "ml": "Malayalam",
    "bn": "Bengali", "mr": "Marathi",
}

# ─────────────────────────────────────────────────────────
# 1. TEXT EXTRACTION UTILITIES
# ─────────────────────────────────────────────────────────
def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
        from io import BytesIO
        reader = PdfReader(BytesIO(file_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages_text.append(f"[Page {i+1}]\n{text}")
        return "\n\n".join(pages_text)
    except ImportError:
        raise RuntimeError("pypdf not installed. Run: pip install pypdf")


def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        import docx
        from io import BytesIO
        doc = docx.Document(BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs)
    except ImportError:
        raise RuntimeError("python-docx not installed. Run: pip install python-docx")


async def extract_text_from_url(url: str, deep: bool = False) -> str:
    """Fetch a URL and return clean text using BeautifulSoup."""
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code != 200:
                return f"Error: Could not fetch URL {url} (Status {resp.status_code})"
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                tag.decompose()
            
            text = soup.get_text(separator='\n')
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            clean_text = '\n'.join(lines)
            
            base_text = f"[Source: {url}]\n" + clean_text[:40000]
            
            if deep:
                # Basic deep crawl implementation using BeautifulSoup to find links
                domain = url.split("/")[2] if "//" in url else url.split("/")[0]
                links = []
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if href.startswith('http') and domain in href:
                        links.append(href)
                    elif href.startswith('/'):
                        links.append(f"https://{domain}{href}")
                
                internal_links = list(set([l for l in links if l != url]))[:2]
                for link in internal_links:
                    try:
                        sub_resp = await client.get(link)
                        sub_soup = BeautifulSoup(sub_resp.text, 'html.parser')
                        for tag in sub_soup(['script', 'style', 'nav', 'footer']):
                            tag.decompose()
                        sub_text = sub_soup.get_text(separator=' ')
                        base_text += f"\n\n[Source: {link}]\n{sub_text[:10000]}"
                    except:
                        pass
            return base_text
    except Exception as e:
        return f"Error crawling {url}: {str(e)}"




async def detect_language(text: str) -> dict:
    """Uses cloud Gemma4 to detect the primary language of the text."""
    try:
        sample = text[:3000]
        prompt = f"""You are a language detection engine. Analyze the following text and determine its primary language.
Return ONLY a valid JSON object:
{{"language_code": "2-letter ISO code (e.g. 'en', 'ta', 'hi')", "language_name": "English name of the language"}}

Text:
{sample}"""

        response = await _call_llm(prompt, max_tokens=50, temperature=0.0, json_mode=True)
        clean_res = response.strip()
        if "```" in clean_res:
            clean_res = clean_res.split("```")[1].split("```")[0].strip()

        data = json.loads(clean_res)
        lang_code = data.get("language_code", "en").lower()

        preset = LANGUAGE_VOICES.get(lang_code)
        if not preset:
            lang_code = "en"
            preset = LANGUAGE_VOICES["en"]
            data["language_name"] = "English (Defaulted)"

        return {
            "language": lang_code,
            "language_name": data.get("language_name", "English"),
            "host1_voice": preset["host1"],
            "host2_voice": preset["host2"]
        }
    except Exception as e:
        print(f"Language detection error: {e}")
        return {
            "language": "en",
            "language_name": "English",
            "host1_voice": "en-US-ChristopherNeural",
            "host2_voice": "en-US-JennyNeural"
        }

def extract_text_from_file(filename: str, file_bytes: bytes) -> str:
    ext = filename.lower().rsplit(".", 1)[-1]
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    if ext in ("docx", "doc"):
        return extract_text_from_docx(file_bytes)
    if ext in ("txt", "md", "html", "htm"):
        return file_bytes.decode("utf-8", errors="ignore")
    raise ValueError(f"Unsupported file type: .{ext}")


# ─────────────────────────────────────────────────────────
# 2. CHUNK & EMBED (for RAG chat)
# ─────────────────────────────────────────────────────────
def _chunk_text(text: str, chunk_size: int = 600, overlap: int = 80) -> list[str]:
    if not text or len(text.strip()) == 0:
        return []
    
    words = text.split()
    # Fallback for texts without spaces (e.g., certain Asian languages or poorly extracted text)
    if not words and len(text) > 0:
        # Split by character chunks as fallback
        char_chunk_size = chunk_size * 5 # heuristic: 1 word ~ 5 chars
        return [text[i : i + char_chunk_size] for i in range(0, len(text), char_chunk_size - overlap * 5)]

    chunks, i = [], 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


_embed_model = None

def _get_embed_model():
    """Returns a wrapper around Google Generative AI embeddings to match the model.encode interface"""
    global _embed_model
    if _embed_model is None:
        genai = _import_google_generativeai()
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment. Required for cloud embeddings.")
        genai.configure(api_key=api_key)
        
        class GeminiEmbedder:
            def encode(self, texts: list[str]):
                # Google allows batch embedding
                try:
                    res = genai.embed_content(
                        model="models/embedding-001", # More stable across older SDK versions
                        content=texts,
                        task_type="retrieval_document"
                    )
                    return res['embeddings']
                except Exception as e:
                    print(f"[FileSpeaker] Embedding failed with models/embedding-001: {e}")
                    # Try text-embedding-004 as fallback
                    try:
                        res = genai.embed_content(
                            model="models/text-embedding-004",
                            content=texts,
                            task_type="retrieval_document"
                        )
                        return res['embeddings']
                    except Exception as e2:
                        print(f"[FileSpeaker] Fallback embedding also failed: {e2}")
                        raise e2
        
        _embed_model = GeminiEmbedder()
    return _embed_model


# ── Lightweight Vector Store (Replaces ChromaDB)
VDB_PATH = Path(__file__).parent / "vector_db"
VDB_PATH.mkdir(exist_ok=True)

def _get_vdb_file(source_id: str):
    return VDB_PATH / f"src_{source_id}.json"

def index_source(source_id: str, text: str) -> int:
    """Chunk text and store embeddings in a simple JSON file. Returns number of chunks."""
    try:
        chunks = _chunk_text(text)
        if not chunks:
            print(f"[FileSpeaker] No chunks generated for source {source_id} (text length: {len(text)})")
            return 0

        model = _get_embed_model()
        embeddings = model.encode(chunks)
        
        data = {
            "chunks": chunks,
            "embeddings": embeddings
        }
        
        with open(_get_vdb_file(source_id), "w", encoding="utf-8") as f:
            json.dump(data, f)
        
        print(f"[FileSpeaker] Successfully indexed source {source_id} with {len(chunks)} chunks")
        return len(chunks)
    except Exception as e:
        print(f"[FileSpeaker] Indexing failed for source {source_id}: {e}")
        raise e


def get_full_source_text(source_id: str) -> str:
    """Retrieve all chunks from the local JSON store and reconstruct text."""
    vfile = _get_vdb_file(source_id)
    if not vfile.exists():
        return ""
    try:
        with open(vfile, "r", encoding="utf-8") as f:
            data = json.load(f)
            return " ".join(data.get("chunks", []))
    except Exception as e:
        print(f"Failed to read source {source_id}: {e}")
    return ""


def retrieve_context(source_ids: list[str], query: str, top_k: int = 5) -> str:
    try:
        res = genai.embed_content(
            model="models/embedding-001",
            content=query,
            task_type="retrieval_query"
        )
        q_embed = res['embedding']
    except:
        res = genai.embed_content(
            model="models/text-embedding-004",
            content=query,
            task_type="retrieval_query"
        )
        q_embed = res['embedding']

    results = []

    for sid in source_ids:
        vfile = _get_vdb_file(sid)
        if not vfile.exists(): continue
        
        try:
            with open(vfile, "r", encoding="utf-8") as f:
                data = json.load(f)
                chunks = data.get("chunks", [])
                embeddings = data.get("embeddings", [])
                
                for chunk, c_embed in zip(chunks, embeddings):
                    # Manual dot product (since Google embeddings are normalized, dot product = cosine similarity)
                    score = sum(a * b for a, b in zip(q_embed, c_embed))
                    results.append((score, chunk))
        except:
            continue

    # Sort by score descending and take top_k
    results.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [r[1] for r in results[:top_k]]
    
    return "\n\n---\n\n".join(top_chunks)


# ─────────────────────────────────────────────────────────
# 3. CHAT WITH DOCUMENT (RAG)
# ─────────────────────────────────────────────────────────
async def chat_with_source(source_ids: list[str], source_titles: list[str], history: list[dict], question: str) -> str:
    context = retrieve_context(source_ids, question)

    if not context:
        context_note = "(Document context unavailable — answering from general knowledge.)"
    else:
        titles_str = ", ".join(source_titles)
        context_note = f"DOCUMENT CONTEXT (from: {titles_str}):\n{context}"

    system_prompt = f"""You are a knowledgeable AI assistant helping a student understand their documents.
Always answer using the provided document context first. If the answer is not in the context, say so clearly.
Keep answers focused, concise, and educational.
**CRITICAL**: When using information from the context, you MUST cite your source accurately at the end of the sentence.
If you see a [Page X] or a [Source: URL] marker in the context, strictly use exactly that format to cite it, e.g., "The mechanism works via X [Page 4]." or "Cloud tech is growing [Source: https://xyz.com/docs]."

{context_note}"""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-8:]:  # keep last 8 turns
        role = "assistant" if msg.get("role") == "ai" else "user"
        messages.append({"role": role, "content": msg.get("text", "")})
    messages.append({"role": "user", "content": question})

    return await _call_llm_chat(messages, max_tokens=1500, temperature=0.3)


# ─────────────────────────────────────────────────────────
# 4. TRANSFORMATIONS
# ─────────────────────────────────────────────────────────
TRANSFORMATION_PROMPTS = {
    "summary": (
        "Create a clear, well-structured 250-300 word summary of this document. "
        "Include: main topic, key arguments, and conclusions. Use plain paragraphs."
    ),
    "key_concepts": (
        "Extract the 8-12 most important concepts, terms, or ideas from this document. "
        "For each, provide: **Concept Name**: 1-2 sentence explanation. "
        "Format as a numbered list."
    ),
    "takeaways": (
        "Extract 5-8 key actionable takeaways or lessons from this document. "
        "What should a student DO or REMEMBER after reading this? "
        "Format as a numbered list with bold action statements."
    ),
    "questions": (
        "Generate 6 thought-provoking questions this document raises. "
        "Mix: 2 comprehension questions, 2 critical thinking questions, 2 open-ended discussion questions. "
        "Format as a numbered list."
    ),
    "flashcards": (
        "Generate exactly 8 flashcard Q&A pairs from the most important facts in this document. "
        "Return ONLY valid JSON array: "
        '[{"front": "Question?", "back": "Answer."}]'
        " — no extra text."
    ),
    "methodology": (
        "Extract the research methodology or approach from this document: "
        "1. Study design/approach, 2. Data/materials used, 3. Methods applied, "
        "4. Analysis techniques, 5. Limitations mentioned. "
        "If this is not a research paper, describe the author's structured approach instead."
    ),
}


async def run_transformation(source_text: str, transformation_type: str) -> str:
    prompt_instruction = TRANSFORMATION_PROMPTS.get(transformation_type)
    if not prompt_instruction:
        raise ValueError(f"Unknown transformation: {transformation_type}")

    # Use only first 12000 chars of text for transform to avoid token overflow
    truncated_text = source_text[:12000]

    # BUG FIX 1: prompt_instruction was duplicated (appeared at top AND bottom of prompt).
    # Removed the redundant top mention — only the instruction at the end is needed.
    prompt = f"""You are a knowledgeable AI assistant helping a student understand their documents.
Always answer using the provided document context first. If the answer is not in the context, say so clearly.
Keep answers focused, concise, and educational.
**CRITICAL**: When using information from the context, you MUST cite your source accurately at the end of the sentence.
If you see a [Page X] or a [Source: URL] marker in the context, strictly use exactly that format to cite it.

DOCUMENT:
---
{truncated_text}
---

{prompt_instruction}"""

    return await _call_llm(prompt, max_tokens=1500, temperature=0.2)


# ─────────────────────────────────────────────────────────
# 5. PODCAST GENERATION
# ─────────────────────────────────────────────────────────
async def detect_document_language(source_text: str) -> str:
    """Detect the primary language of the source document using Gemma4. Returns lang code."""
    sample = source_text[:2000]
    prompt = f"""Detect the primary language of this text. Respond with ONLY the 2-letter language code from this list:
en, ta, hi, te, kn, ml, bn, mr

If the text is in multiple languages, pick the most dominant one.
If you are not sure or the text is in an unsupported language, respond with: en

TEXT SAMPLE:
---
{sample}
---

Respond with ONLY the 2-letter code (e.g., "ta" or "hi" or "en"). Nothing else."""

    try:
        result = await _call_llm(prompt, max_tokens=5, temperature=0.0)
        code = result.strip().lower()[:2]
        if code in LANGUAGE_VOICES:
            return code
    except Exception as e:
        print(f"[FileSpeaker] Language detection failed: {e}")
    return "en"


async def generate_podcast_script(
    source_text: str,
    topic: str,
    host1_name: str = "Alex",
    host2_name: str = "Sam",
    tone: str = "educational and engaging",
    length: str = "medium",
    language: str = "en",
) -> str:
    """Generate a 2-host conversational podcast script using Gemma4 in the specified language."""
    min_exchanges = {"short": 6, "medium": 12, "long": 20}.get(length, 12)
    truncated_text = source_text[:10000]
    lang_name = LANGUAGE_NAMES.get(language, "English")

    # Enhanced language instruction with explicit direction for all supported languages
    if language != "en":
        language_instruction = f"""CRITICAL REQUIREMENT: You MUST write the ENTIRE script in {lang_name} ({language}). 
Every single line of dialogue MUST be written in {lang_name} script ONLY.
Do NOT use any English words. Translate all technical concepts completely into {lang_name}.
Example format:
{host1_name}: [Greeting and introduction in {lang_name}]
{host2_name}: [Enthusiastic response and curiosity in {lang_name}]
"""
    else:
        language_instruction = ""

    prompt = f"""You are a professional podcast script writer fluent in {lang_name}. Create an engaging educational podcast script entirely in {lang_name}.

TOPIC: {topic}
TONE: {tone}
HOSTS: {host1_name} (expert, explains deeply) and {host2_name} (curious learner, asks great questions)
EXCHANGES: Exactly {min_exchanges} back-and-forth exchanges
{language_instruction}

SOURCE MATERIAL:
---
{truncated_text}
---

Write a natural, conversational script. Format EXACTLY like this:

{host1_name}: [Complete dialogue in {lang_name}]
{host2_name}: [Complete dialogue in {lang_name}]
{host1_name}: [Complete dialogue in {lang_name}]
...

Critical Rules:
- MUST BE WRITTEN ENTIRELY IN {lang_name.upper()}
- Start with an engaging intro from {host1_name}
- {host2_name} asks clarifying questions throughout
- Cover the main concepts from the source material
- End with a summary and call to action
- Keep each line 1-3 sentences max
- Sound natural, not robotic
- NO ENGLISH WORDS ALLOWED - translate everything to {lang_name}"""

    return await _call_llm(prompt, max_tokens=3000, temperature=0.65)


def _parse_script_lines(script: str, host1: str, host2: str) -> list[dict]:
    """Parse the generated script into {speaker, text} pairs."""
    lines = []
    for raw_line in script.splitlines():
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        if raw_line.startswith(f"{host1}:"):
            text = raw_line[len(host1)+1:].strip()
            if text:
                lines.append({"speaker": host1, "text": text})
        elif raw_line.startswith(f"{host2}:"):
            text = raw_line[len(host2)+1:].strip()
            if text:
                lines.append({"speaker": host2, "text": text})
    return lines


async def synthesize_audio(
    script_lines: list[dict],
    host1: str, host1_voice: str,
    host2: str, host2_voice: str,
    output_file: str,
) -> bool:
    """Convert script lines to audio using edge-tts and merge with pydub."""
    try:
        import edge_tts
        from pydub import AudioSegment
    except ImportError:
        raise RuntimeError(
            "Audio dependencies missing. Run: pip install edge-tts pydub"
        )

    segments: list[AudioSegment] = []
    silence_short  = AudioSegment.silent(duration=400)
    silence_medium = AudioSegment.silent(duration=700)

    for i, line in enumerate(script_lines):
        voice   = host1_voice if line["speaker"] == host1 else host2_voice
        tmp_mp3 = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp_mp3.close()

        communicate = edge_tts.Communicate(line["text"], voice)
        await communicate.save(tmp_mp3.name)

        seg = AudioSegment.from_mp3(tmp_mp3.name)
        segments.append(seg)
        # Short pause between same speaker, medium pause between different speakers
        if i < len(script_lines) - 1:
            next_speaker = script_lines[i + 1]["speaker"]
            segments.append(silence_medium if next_speaker != line["speaker"] else silence_short)

        os.unlink(tmp_mp3.name)

    if not segments:
        return False

    combined = segments[0]
    for s in segments[1:]:
        combined += s

    combined.export(output_file, format="mp3", bitrate="128k")
    return True


async def generate_full_podcast(
    source_id: str,
    source_text: str,
    topic: str,
    host1_name: str = "Alex",
    host2_name: str = "Sam",
    host1_voice: str = "en-US-ChristopherNeural",  # Male
    host2_voice: str = "en-US-JennyNeural",         # Female
    tone: str = "educational and engaging",
    length: str = "medium",
    language: str = "en",
) -> dict:
    """Full pipeline: script → parse → TTS → merge. Returns {audio_url, script, duration_est, language}"""

    print(f"[FileSpeaker] Generating podcast script for '{topic}' in language '{language}'...")
    script = await generate_podcast_script(
        source_text, topic, host1_name, host2_name, tone, length, language
    )

    lines = _parse_script_lines(script, host1_name, host2_name)
    if not lines:
        raise RuntimeError("Script parsing failed — no dialogue lines detected.")

    podcast_id  = str(uuid.uuid4())[:8]
    audio_path  = AUDIO_DIR / f"podcast_{podcast_id}.mp3"

    print(f"[FileSpeaker] Synthesizing {len(lines)} dialogue lines to audio...")
    success = await synthesize_audio(lines, host1_name, host1_voice, host2_name, host2_voice, str(audio_path))

    if not success:
        raise RuntimeError("Audio synthesis failed.")

    word_count = sum(len(l["text"].split()) for l in lines)
    # Adjust WPM for different languages (scripts tend to be shorter in Indian langs)
    wpm = 130 if language == "en" else 100
    duration_min = max(1, round(word_count / wpm))

    return {
        "podcast_id": podcast_id,
        "audio_filename": audio_path.name,
        "script": script,
        "lines": lines,
        "duration_estimate": f"~{duration_min} min",
        "host1": host1_name,
        "host2": host2_name,
        "language": language,
        "language_name": LANGUAGE_NAMES.get(language, "English"),
        "created_at": str(uuid.uuid4()),  # unique timestamp marker
    }

async def generate_podcast_interact(
    podcast_script: str, question: str,
    host_name: str = "Alex", host_voice: str = "en-US-ChristopherNeural",
    language: str = "en",
) -> dict:
    lang_name = LANGUAGE_NAMES.get(language, "English")
    
    # Enhanced language instruction for interactions matching the script language
    if language == "ta":
        language_instruction = f"Answer ONLY in Tamil (தமிழ்). Every word must be in Tamil. No English allowed."
    elif language != "en":
        language_instruction = f"Answer ONLY in {lang_name}. Translate everything to {lang_name}. Do NOT use English."
    else:
        language_instruction = ""

    prompt = f"""You are {host_name}, a friendly podcast host speaking in {lang_name}.
A listener just paused the podcast and asked a question.
{language_instruction}

CURRENT PODCAST SCRIPT REVEALED SO FAR:
---
{podcast_script[-3000:]}
---

LISTENER'S QUESTION: "{question}"

Answer extremely briefly, in 1-3 sentences in {lang_name}. Sound natural and conversational, as if you are pausing the show to answer someone directly.
IMPORTANT: Provide ONLY the dialogue text. Do NOT include your name ({host_name}:) or any quotes at the beginning. Just the words you want to speak."""

    ans_text = await _call_llm(prompt, max_tokens=300, temperature=0.5)
    print(f"[FileSpeaker] Raw interact LLM response: {repr(ans_text)}")

    import re
    # Robustly strip the host name if it appears at the beginning
    ans_text = re.sub(rf"^\*?\*?{host_name}\*?\*?\s*:\s*", "", ans_text, flags=re.IGNORECASE).strip()

    # BUG FIX 4: Validate that we have actual text before calling TTS
    if not ans_text:
        print("[FileSpeaker] LLM returned an empty response for podcast interaction.")
        ans_text = "I'm sorry, I didn't quite catch that. Could you ask again?"

    podcast_id = str(uuid.uuid4())[:8]
    audio_path = AUDIO_DIR / f"interact_{podcast_id}.mp3"

    # BUG FIX 2: Pass host_voice for BOTH speakers to avoid 'Nobody' voice crash.
    # Only host_name lines exist in this list so host2 voice is never actually used.
    lines = [{"speaker": host_name, "text": ans_text}]
    success = await synthesize_audio(
        lines, host_name, host_voice, host_name, host_voice, str(audio_path)
    )

    if not success:
        raise RuntimeError("Audio synthesis failed.")

    return {
        "text": ans_text,
        "audio_url": audio_path.name,
    }
