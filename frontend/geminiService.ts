import {
  CareerRoadmap,
  DailyTask,
  QuizQuestion,
  UserProfile,
  HeroStory,
} from "./types";
import { GoogleGenAI, Type } from "@google/genai";

// ─────────────────────────────────────────────────────────────
//  PRIMARY: Local AI Backend (Crawl4AI + Ollama Gemma4 (gemma4:e4b))
// ─────────────────────────────────────────────────────────────

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const BACKEND_TIMEOUT_MS = 180_000; // 3 min — local LLM can be slow on first run

/**
 * Try to generate roadmap from the local FastAPI + Crawl4AI + Gemma4 backend.
 * Returns null if the backend is unreachable or returns an error.
 */
async function generateRoadmapFromBackend(
  profile: UserProfile,
): Promise<CareerRoadmap | null> {
  try {
    const params = new URLSearchParams({
      dream: profile.dream || "",
      year: profile.year || "Student",
      branch: profile.branch || "General",
      language: localStorage.getItem('kalam_spark_lang') || 'en',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    const res = await fetch(`${BACKEND_URL}/api/roadmap?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      console.warn(`[RoadmapBackend] HTTP ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();

    // Validate the response has the expected shape
    if (
      data &&
      typeof data.dream === "string" &&
      Array.isArray(data.stages) &&
      data.stages.length > 0
    ) {
      console.log(
        `[RoadmapBackend] ✅ Got roadmap from local backend (${data.stages.length} stages, source: ${data._source || "fresh"})`,
      );
      // Strip internal metadata fields before returning to the app
      const { _source, _crawled_sources, _generation_time_s, ...roadmap } = data;
      return roadmap as CareerRoadmap;
    }

    console.warn("[RoadmapBackend] Invalid response shape:", data);
    return null;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[RoadmapBackend] Request timed out after 3 minutes");
    } else {
      console.warn("[RoadmapBackend] Backend unreachable:", err?.message || err);
    }
    return null;
  }
}

/**
 * generateRoadmap — Tries local backend first, falls back to Gemini.
 *
 * Flow:
 *   1. Local FastAPI backend (Crawl4AI + Gemma4) → real-data backed roadmap
 *   2. Gemini API fallback → generic but always-available roadmap
 */
export const generateRoadmap = async (
  profile: UserProfile,
): Promise<CareerRoadmap> => {
  // Always use backend (Gemma4)
  console.log("[generateRoadmap] Using local AI backend (Gemma4)...");
  const backendResult = await generateRoadmapFromBackend(profile);
  if (backendResult) {
    return backendResult;
  }
  throw new Error("Backend unavailable. Please check FastAPI server.");
};

export const discoverDream = async (interests: string[], personality: string[]): Promise<any[]> => {
  try {
    const params = new URLSearchParams({
      interests: interests.join(", "),
      personality: personality.join(" | "),
      language: localStorage.getItem('kalam_spark_lang') || 'en'
    });
    const res = await fetch(`${BACKEND_URL}/api/discover_dream?${params}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("discoverDream API error", err);
  }
  // Fallback if backend fails
  return [
    { dream: 'Software Engineer', subjects: ['Computer Science', 'Mathematics', 'Programming'] },
    { dream: 'Research Scientist', subjects: ['Physics', 'Mathematics', 'Chemistry'] },
    { dream: 'Product Manager', subjects: ['Business', 'Leadership', 'Design'] }
  ];
};

export const getHeroStory = async (dream: string): Promise<HeroStory> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Tell a very short, exciting story of a real person who became a successful ${dream}. Use simple English for kids. Return JSON with name, role, achievement, summary.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            achievement: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ["name", "role", "achievement", "summary"],
        },
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {
      name: "A Big Dreamer",
      role: dream,
      achievement: "Success",
      summary: "They worked hard and reached their goal!",
    };
  }
};

export const getDynamicResources = async (
  profile: UserProfile,
  stage: any,
): Promise<any> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are Dream Mentor AI. Your task is to recommend REAL educational resources.
  
  USER PROFILE:
  - Dream: ${profile.dream}
  - Current Topic: ${stage.title}
  - Focus Skills: ${(stage.skills || []).join(", ")}
  - Level: ${profile.year}

  STRICT REQUIREMENTS:
  1. VIDEOS: Recommend real, popular YouTube videos/channels for this topic. Use realistic YouTube links (https://www.youtube.com/watch?v=...).
  2. BOOKS: Recommend real books available on Google Books (https://books.google.com/books?id=...) or Open Library. Use real book titles.
  3. NEWS: Recommend recent industry news articles with realistic URLs from major publications.
  
  Return at least 2-3 items per category. Use real resource titles and descriptions.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Recommend high-quality YouTube lectures, Google Books, and recent industry news for a ${profile.year} student learning "${stage.title}" to become a ${profile.dream}. Focus on: ${(stage.subjects || []).join(", ")}.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            books: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  link: { type: Type.STRING },
                },
                required: ["title", "link", "summary"],
              },
            },
            videos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  link: { type: Type.STRING },
                },
                required: ["title", "link", "summary"],
              },
            },
            news: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  link: { type: Type.STRING },
                },
                required: ["title", "link", "summary"],
              },
            },
          },
        },
      },
    });

    const text = response.text?.trim();
    if (!text) return { books: [], videos: [], news: [] };

    const data = JSON.parse(text);
    return data;
  } catch (e) {
    console.error("Resource fetch error:", e);
    return { books: [], videos: [], news: [] };
  }
};

export const getMotivationalQuote = async (dream: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `A simple, 1-line quote for a student who wants to be a ${dream}. Use very easy words.`,
    });
    return (
      response.text?.trim() || "You can do it! Just take one step at a time."
    );
  } catch (e) {
    return "Dream big and work hard!";
  }
};

export const getCareerNews = async (dream: string): Promise<any[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Exciting news about ${dream} in simple words for kids.`,
      config: { tools: [{ googleSearch: {} }] },
    });
    return (
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    ).map((c) => ({
      title: c.web?.title || "Latest Update",
      link: c.web?.uri || "#",
      summary: "Cool things happening in the world of " + dream,
    }));
  } catch (e) {
    return [];
  }
};

export const generateMicroQuiz = async (
  subject: string,
  tasks: string[] = []
): Promise<QuizQuestion[]> => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${backendUrl}/api/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, tasks })
    });
    
    if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    console.error("Local Gemma4 quiz generation failed, returning fallback:", e);
  }
  
  // Fallbacks if backend fails
  const fallbackSeed = Math.floor(Math.random() * 3);
  if (fallbackSeed === 0) {
    return [
      {
        question: `What is the most important approach when learning about ${subject}?`,
        options: ["Consistency and practice", "Hardware upgrades", "Skipping the basics", "Memorizing blindly"],
        correctAnswer: 0,
        explanation: "Consistency and continuous practice are the most reliable ways to master any new subject."
      },
      {
        question: `Why is ${subject} considered a valuable skill?`,
        options: ["It has no real value", "It directly opens up new career opportunities", "It only helps with typing speed", "It uses up less electricity"],
        correctAnswer: 1,
        explanation: "Mastering core subjects leads directly to professional growth and better opportunities in your dream career."
      },
      {
        question: `How should you tackle complex problems in ${subject}?`,
        options: ["Give up immediately", "Break them down into smaller, manageable steps", "Ignore the errors completely", "Copy solutions without understanding"],
        correctAnswer: 1,
        explanation: "Decomposition—breaking down complex problems into smaller parts—is the fundamental approach to solving hard challenges."
      },
      {
        question: `Why is hands-on practice important for ${subject}?`,
        options: ["To apply concepts", "To look busy", "To waste time", "It is not important"],
        correctAnswer: 0,
        explanation: "Active, hands-on practice cements theoretical concepts into actual workable skills."
      },
      {
        question: `When stuck on a problem in ${subject}, what should you do?`,
        options: ["Quit entirely", "Ask for help or check documentation", "Stare at it until it works", "Delete everything"],
        correctAnswer: 1,
        explanation: "Good problem solving involves leveraging community resources, mentors, and official documentation."
      }
    ];
  } else {
    return [
      {
        question: `When studying ${subject}, what helps retention the most?`,
        options: ["Cramming overnight", "Teaching it to someone else", "Reading the same page 10 times", "Listening to loud music"],
        correctAnswer: 1,
        explanation: "Teaching a concept forces you to understand it deeply and identify gaps in your own knowledge."
      },
      {
        question: `Which mindset is most useful for ${subject}?`,
        options: ["Fixed mindset", "Growth mindset", "Defeatist mindset", "Complacent mindset"],
        correctAnswer: 1,
        explanation: "A growth mindset embraces challenges and sees failure as a stepping stone to mastery."
      },
      {
        question: `How do experienced professionals in ${subject} stay updated?`,
        options: ["They never read anything new", "They rely solely on old textbooks", "They follow industry news and communities", "They assume they know everything"],
        correctAnswer: 2,
        explanation: "Continuous learning through industry news, blogs, and communities is essential for long-term success."
      },
      {
        question: `What distinguishes a senior professional in ${subject} from a beginner?`,
        options: ["Typing speed", "Deep understanding and system architecture skills", "Memorization of syntax", "The price of their computer"],
        correctAnswer: 1,
        explanation: "Seniority comes from deep conceptual understanding and the ability to design resilient overall systems, not just raw knowledge."
      },
      {
        question: `How do you measure success when studying ${subject}?`,
        options: ["Hours spent staring at screen", "Ability to confidently apply concepts to build something", "Number of certificates", "Number of books bought"],
        correctAnswer: 1,
        explanation: "The ultimate metric of learning is your ability to confidently apply those skills to solve real-world problems."
      }
    ];
  }
};

export const generateDreamSummary = async (dream: string, branch: string, year: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const prompt = `A student wants to become a "${dream}". Their subject interest is "${branch}" and education level is "${year}".

Write a HIGHLY SPECIFIC career overview in exactly 3 sentences (plain text, NO markdown, NO bullet points, NO numbering):
Sentence 1: What a ${dream} IS specifically (not a generic professional) and their unique role in society.
Sentence 2: What they do day-to-day on the job (specific tools, environment, or activities unique to ${dream}).
Sentence 3: Their key responsibilities (name 2-3 concrete duties ONLY performed by a ${dream}).

STRICT RULE: Do NOT give a generic "skilled professional" description. If the dream is "${dream}", the description MUST be about ${dream}.
Be specific, inspiring, and human.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    const text = response.text?.trim();
    if (!text) throw new Error('Empty response');
    return text;
  } catch (e: any) {
    console.error('generateDreamSummary failed:', e?.message || e);
    // Detailed fallback per career type
    const dreamLower = dream.toLowerCase();
    if (dreamLower.includes('engineer') || dreamLower.includes('developer')) {
      return `A ${dream} designs, builds, and maintains software systems and digital products that power modern life. Every day, they write code, review pull requests, debug issues, and collaborate with product teams in fast-paced agile cycles. Their core responsibilities include architecting scalable solutions, shipping reliable features, and continuously improving system performance.`;
    } else if (dreamLower.includes('doctor') || dreamLower.includes('physician')) {
      return `A ${dream} diagnoses illnesses, prescribes treatments, and guides patients through their healthcare journey with compassion. Daily work involves patient consultations, reviewing test results, writing prescriptions, and coordinating with specialists and nurses. Their key responsibilities include accurate diagnosis, patient education, and maintaining up-to-date medical knowledge.`;
    } else if (dreamLower.includes('teacher') || dreamLower.includes('educator')) {
      return `A ${dream} shapes young minds by making complex subjects accessible, engaging, and deeply meaningful for students. Each day involves lesson planning, delivering dynamic classes, grading assignments, and providing individualized support. Their core responsibilities include curriculum design, student assessment, and fostering a positive classroom environment.`;
    } else {
      return `A ${dream} is a skilled professional who applies their expertise to create meaningful impact in their field every single day. Their daily work involves solving complex challenges, collaborating with diverse teams, and continuously refining their craft through hands-on experience. Their core responsibilities include planning and executing projects, mentoring others, and delivering consistent, high-quality results.`;
    }
  }
};
