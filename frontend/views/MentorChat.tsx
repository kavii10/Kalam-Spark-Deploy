
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, History, MessageSquare, Trash2,
  Loader2, Plus, ChevronRight, Mic, Paperclip, Image,
  FileText, Video, X, Sparkles, Eye, Copy, Volume2, Share2, Edit2, VolumeX
} from 'lucide-react';
import { UserProfile } from '../types';
import { dbService, MENTOR_SESSION_ID } from '../dbService';

/* ─── Types ─── */
interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  ts?: number;
  attachmentPreview?: string; // data URL for display
  attachmentName?: string;
}

interface HistorySession {
  date: string;
  sessionId: string;
  pairs: { question: string; answer: string; time: string }[];
}

interface AttachmentState {
  file: File;
  base64: string;       // pure base64, no prefix
  mimeType: string;     // image/png, image/jpeg, text, application/pdf, etc.
  preview: string;      // data URL for display
  name: string;
  isImage: boolean;
  isVideo: boolean;
  isDoc: boolean;
}

/* ─── Constants ─── */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const ACCEPTED_FILES = "image/*,video/*,.pdf,.docx,.doc,.txt,.md";

/* ─── Markdown renderer ─── */
function renderMd(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(124,58,237,0.15);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left:1.2em;list-style-type:decimal">$1</li>')
    .replace(/^[-•]\s+(.+)$/gm, '<li style="margin-left:1.2em;list-style-type:disc">$1</li>')
    .replace(/(<li[^>]*>[^<]+<\/li>\n?)+/g, m => `<ul style="margin:6px 0;padding:0">${m}</ul>`)
    .replace(/\n/g, '<br>');
}

/* ─── File → base64 + metadata helper ─── */
async function processAttachment(file: File): Promise<AttachmentState> {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isDoc   = !isImage && !isVideo;

  return new Promise((resolve, reject) => {
    if (isVideo) {
      // Extract first frame from video using canvas
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.muted = true;
      const url = URL.createObjectURL(file);
      videoEl.src = url;
      videoEl.currentTime = 0.5;
      videoEl.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = Math.min(videoEl.videoWidth,  960);
        canvas.height = Math.min(videoEl.videoHeight, 540);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const b64 = dataUrl.split(',')[1];
        URL.revokeObjectURL(url);
        resolve({
          file, base64: b64, mimeType: 'image/jpeg',
          preview: dataUrl, name: file.name,
          isImage: false, isVideo: true, isDoc: false,
        });
      };
      videoEl.onerror = reject;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        let mimeType = file.type || 'text/plain';
        // Treat docs as text context
        if (isDoc) mimeType = 'text';
        resolve({
          file, base64: b64, mimeType,
          preview: isImage ? dataUrl : '',
          name: file.name,
          isImage, isVideo: false, isDoc,
        });
      };
      reader.onerror = reject;
      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        // Read text-based docs as text
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          reader.readAsDataURL(file); // send as base64 — backend receives it as doc text
        } else {
          reader.readAsText(file);
        }
      }
    }
  });
}

import { getCurrentLang } from '../i18n';

/* ─── API call ─── */
async function callLocalMentor(
  messages: ChatMessage[],
  userText: string,
  user: UserProfile,
  attachment?: AttachmentState
): Promise<string> {
  const payload: any = {
    user: {
      name: user.name || 'Student',
      dream: user.dream || 'a great career',
      year: user.year || 'student',
      branch: user.branch || 'general studies',
      currentStageIndex: user.currentStageIndex || 0,
    },
    messages: messages.map(m => ({ role: m.role, text: m.text })),
    new_message: userText,
    language: getCurrentLang() || 'en', // Pass language to backend
  };

  if (attachment) {
    payload.attachment_base64 = attachment.base64;
    payload.attachment_type   = attachment.mimeType;
  }

  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Mentor API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  if (!data.reply) throw new Error('Empty response from Mentor AI');
  return data.reply;
}

/* ─── Group flat DB messages into sessions ─── */
function groupIntoPairs(
  rawMessages: { role: 'user' | 'ai'; text: string; created_at: string; session_id?: string }[]
): HistorySession[] {
  const sessions: Record<string, HistorySession> = {};
  for (let i = 0; i < rawMessages.length; i++) {
    const msg = rawMessages[i];
    if (msg.role !== 'user') continue;
    const aiMsg   = rawMessages[i + 1];
    const answer  = aiMsg && aiMsg.role === 'ai' ? aiMsg.text : '(no response saved)';
    const dateObj  = new Date(msg.created_at);
    const dateKey  = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const sessionId = msg.session_id || dateKey;
    const timeStr   = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (!sessions[sessionId]) sessions[sessionId] = { date: dateKey, sessionId, pairs: [] };
    sessions[sessionId].pairs.push({ question: msg.text, answer, time: timeStr });
    if (aiMsg && aiMsg.role === 'ai') i++;
  }
  return Object.values(sessions).reverse();
}

/* ─── Welcome message ─── */
const makeWelcome = (user: UserProfile): ChatMessage => ({
  role: 'ai',
  text: `Hi ${user.name || 'there'}! 👋 I'm your **Dream Spark AI Mentor**, powered by **Gemma4**. I can help with career planning, study tips, skill development — and I even understand **images, videos, and documents** you share! Ask me anything about your journey to become a ${user.dream || 'future professional'}. 🚀`,
  ts: Date.now()
});

/* ─── Attachment type icon ─── */
function AttachmentIcon({ att }: { att: AttachmentState }) {
  if (att.isImage) return <Image size={14} className="text-violet-300" />;
  if (att.isVideo) return <Video size={14} className="text-emerald-300" />;
  return <FileText size={14} className="text-amber-300" />;
}

/* ─── Main Component ─── */
export default function MentorChat({ user }: { user: UserProfile }) {
  const isLight = user.settings?.theme === 'light';
  const [activeTab, setActiveTab]         = useState<'chat' | 'history'>('chat');
  const [messages, setMessages]           = useState<ChatMessage[]>([makeWelcome(user)]);
  const [input, setInput]                 = useState('');
  const [attachment, setAttachment]       = useState<AttachmentState | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const [recording, setRecording]         = useState(false);
  const [isTyping, setIsTyping]           = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [clearConfirm, setClearConfirm]       = useState(false);
  const [clearing, setClearing]               = useState(false);
  const [expandedDates, setExpandedDates]     = useState<Set<string>>(new Set());
  const [speakingIdx, setSpeakingIdx]         = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  /* ── Handle file selection ── */
  const handleFileSelect = useCallback(async (file: File) => {
    setAttachLoading(true);
    try {
      const att = await processAttachment(file);
      setAttachment(att);
    } catch (e) {
      console.error('Attachment processing failed:', e);
      alert('Could not process this file. Try a different format.');
    } finally {
      setAttachLoading(false);
    }
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const raw     = await dbService.getMentorHistory(user.id);
      const grouped = groupIntoPairs(raw as any);
      setHistorySessions(grouped);
      if (grouped.length > 0) setExpandedDates(new Set([grouped[0].sessionId]));
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isTyping) return;

    const userText = input.trim() || (attachment ? `[Analyzing ${attachment.isVideo ? 'video' : attachment.isImage ? 'image' : 'document'}: ${attachment.name}]` : '');
    setInput('');
    const att = attachment;
    setAttachment(null);
    setRecording(false);

    const userMsg: ChatMessage = {
      role: 'user', text: userText, ts: Date.now(),
      attachmentPreview: att?.preview || undefined,
      attachmentName: att?.name,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    dbService.saveMentorMessage(user.id, 'user', userText);

    try {
      const aiText = await callLocalMentor(messages, userText, user, att || undefined);
      setMessages(prev => [...prev, { role: 'ai', text: aiText, ts: Date.now() }]);
      dbService.saveMentorMessage(user.id, 'ai', aiText);
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorText = "I'm having a connection issue. Please ensure the backend is running.";
      const msg = error.message || '';
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        errorText = "I'm a bit busy right now! Please wait 30 seconds and try again. 😊";
      } else if (msg.includes('400') || msg.includes('401') || msg.includes('403')) {
        errorText = "There's a configuration issue with my connection. Please check the backend.";
      }
      setMessages(prev => [...prev, { role: 'ai', text: errorText, ts: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setMessages([makeWelcome(user)]);
    setInput('');
    setAttachment(null);
    setActiveTab('chat');
  };

  const handleClearHistory = async () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    setClearing(true);
    try {
      await dbService.clearMentorHistory(user.id);
      setHistorySessions([]);
      setExpandedDates(new Set());
      setClearConfirm(false);
    } catch (e) {
      console.error('Clear failed', e);
    } finally {
      setClearing(false);
    }
  };

  const toggleDate = (id: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* ── Voice input ── */
  const handleVoiceInput = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input not supported in this browser.'); return; }
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const rec = new SR();
    recognitionRef.current = rec;
    // FIX: Use current app language for speech recognition instead of hardcoded English
    const currentLang = getCurrentLang() || 'en';
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'ta': 'ta-IN',  // Tamil - India
      'hi': 'hi-IN',  // Hindi - India
      'te': 'te-IN',  // Telugu - India
      'kn': 'kn-IN',  // Kannada - India
      'ml': 'ml-IN',  // Malayalam - India
    };
    rec.lang = langMap[currentLang] || 'en-US';
    rec.interimResults = false;
    rec.onstart = () => setRecording(true);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
    };
    rec.onend = () => setRecording(false);
    rec.start();
  };

  const totalPairs = historySessions.reduce((s, d) => s + d.pairs.length, 0);
  const suggestions = [
    `How do I start learning ${user.branch || 'my subject'}?`,
    `What skills do I need for ${user.dream || 'my dream career'}?`,
    'Create a weekly study plan for me',
    'What projects should I build to get hired?'
  ];

  /* ── Message Actions ── */
  const handleCopyMsg = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleReadAloud = (idx: number, text: string) => {
    if ('speechSynthesis' in window) {
      if (speakingIdx === idx && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setSpeakingIdx(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''));
      
      let detectedLang = getCurrentLang() || 'en';
      // Auto-detect Indian languages based on Unicode block to override UI language if needed
      if (/[\u0B80-\u0BFF]/.test(text)) detectedLang = 'ta';
      else if (/[\u0900-\u097F]/.test(text)) detectedLang = 'hi';
      else if (/[\u0C00-\u0C7F]/.test(text)) detectedLang = 'te';
      else if (/[\u0C80-\u0CFF]/.test(text)) detectedLang = 'kn';
      else if (/[\u0D00-\u0D7F]/.test(text)) detectedLang = 'ml';
      else if (/[\u0980-\u09FF]/.test(text)) detectedLang = 'bn';
      else if (/[\u0900-\u097F]/.test(text)) detectedLang = 'mr'; // Marathi share block with Hindi

      const langMap: Record<string, string> = {
        'en': 'en-US',
        'ta': 'ta-IN',
        'hi': 'hi-IN',
        'te': 'te-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'bn': 'bn-IN',
        'mr': 'mr-IN',
      };
      
      const targetLangCode = langMap[detectedLang] || 'en-US';
      utterance.lang = targetLangCode;
      
      // Explicitly set the voice to avoid browser defaulting to English
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.replace('_', '-') === targetLangCode) 
                 || voices.find(v => v.lang.replace('_', '-').startsWith(detectedLang));
      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = 0.95; // Slightly slower for clarity in non-English languages
      utterance.pitch = 1.0;
      
      utterance.onend = () => setSpeakingIdx(null);
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setSpeakingIdx(null);
      };

      // Some browsers require getVoices to be called before speak
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.speak(utterance);
          window.speechSynthesis.onvoiceschanged = null;
        };
      } else {
        window.speechSynthesis.speak(utterance);
      }
      setSpeakingIdx(idx);
    }
  };

  const handleDeleteMsg = (idx: number) => {
    if (confirm('Delete this message?')) {
      setMessages(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleShareMsg = (text: string) => {
    if (navigator.share) {
      navigator.share({ title: 'AI Mentor Chat', text }).catch(() => handleCopyMsg(text));
    } else {
      handleCopyMsg(text);
      alert('Copied to clipboard to share');
    }
  };

  const handleEditMsg = (idx: number, text: string) => {
    setInput(text);
    // Remove the user message being edited and all subsequent messages
    setMessages(prev => prev.slice(0, idx));
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col fade-up mentor-container">
      {/* ── Header ── */}
      <div className={`flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 border-b rounded-t-2xl mentor-header gap-4 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800/60'}`}>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/40 to-indigo-600/30 border border-violet-500/40 flex items-center justify-center text-violet-600 mentor-ai-avatar relative shadow-lg shadow-violet-900/20">
            <Bot size={24} className={isLight ? 'text-violet-600' : 'text-violet-300'} />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-900 flex items-center justify-center">
              <span className="block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </span>
          </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base font-bold truncate ${isLight ? 'text-zinc-800' : 'text-white'}`}>AI Mentor</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${isLight ? 'bg-violet-100 border-violet-200 text-violet-600' : 'bg-violet-500/20 border-violet-500/30 text-violet-300'}`}>
                    <Sparkles size={10} />Gemma4
                  </span>
                  <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${isLight ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'}`}>
                    <Eye size={10} />Vision
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className={`text-xs truncate ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Online · Focused on {user.dream || 'your dream'}</p>
              </div>
            </div>
        </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={handleNewChat}
              title="Start a new chat"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all mentor-new-chat-btn whitespace-nowrap flex-1 md:flex-initial justify-center ${isLight ? 'text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-violet-300 hover:bg-violet-50 shadow-sm' : 'text-zinc-300 hover:text-white bg-zinc-800/80 border border-zinc-700/60 hover:border-violet-500/40 hover:bg-zinc-700/60'}`}
            >
              <Plus size={14} /> New Chat
            </button>
            <div className={`flex items-center gap-1 p-1 rounded-xl mentor-tab-toggle flex-1 md:flex-initial ${isLight ? 'bg-zinc-100 border border-zinc-200' : 'bg-zinc-800/80 border border-zinc-700/60'}`}>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'chat' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30' : 'text-zinc-500 hover:text-white'}`}
              >
                <MessageSquare size={13} /> Chat
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30' : 'text-zinc-500 hover:text-white'}`}
              >
                <History size={13} /> History
              </button>
            </div>
          </div>
      </div>

      {/* ── CHAT TAB ── */}
      {activeTab === 'chat' ? (
        <>
          <div
            ref={scrollRef}
            className={`flex-1 overflow-y-auto space-y-4 p-5 border-x mentor-chat-area ${isLight ? 'border-zinc-200 bg-white' : 'border-zinc-800/60 bg-zinc-950/40'}`}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} fade-up mb-2`}
              >
                <div className={`hidden sm:flex w-10 h-10 rounded-xl shrink-0 items-center justify-center ${
                  msg.role === 'user' 
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30' 
                    : isLight 
                      ? 'bg-violet-100 text-violet-600 mentor-ai-avatar border border-violet-200' 
                      : 'bg-gradient-to-br from-violet-600/30 to-indigo-600/20 text-violet-300 border border-violet-500/20 mentor-ai-avatar'
                }`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className="flex flex-col gap-2 w-full sm:max-w-[85%]">
                  {/* Attachment preview */}
                  {msg.attachmentPreview && (
                    <div className={`rounded-lg overflow-hidden border border-violet-500/20 ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                      <img src={msg.attachmentPreview} alt="Attachment" className="max-w-[200px] max-h-[140px] object-cover" />
                      {msg.attachmentName && (
                        <p className="text-[10px] text-zinc-500 px-2 py-1 bg-zinc-900/60">{msg.attachmentName}</p>
                      )}
                    </div>
                  )}
                  {msg.attachmentName && !msg.attachmentPreview && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                      <FileText size={12} />
                      <span className="truncate max-w-[160px]">{msg.attachmentName}</span>
                    </div>
                  )}
                  {msg.text && (
                    <>
                      <div
                        className={`px-4 sm:px-5 py-3 sm:py-4 rounded-2xl text-[14px] sm:text-[15px] leading-relaxed ${
                          msg.role === 'user'
                            ? `bg-violet-600/15 border border-violet-500/20 ${isLight ? 'text-zinc-800' : 'text-zinc-200'} rounded-tr-sm mentor-user-bubble whitespace-pre-wrap ml-auto`
                            : isLight 
                              ? 'bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-tl-sm mentor-ai-bubble'
                              : 'bg-zinc-800/40 border border-zinc-700/30 text-zinc-200 rounded-tl-sm mentor-ai-bubble'
                        }`}
                        dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }}
                      />
                      
                      {/* Action Bar */}
                      <div className={`flex items-center gap-1 mt-0.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' ? (
                          <>
                            <button onClick={() => handleCopyMsg(msg.text)} title="Copy" className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}>
                              <Copy size={13} />
                            </button>
                            <button onClick={() => handleReadAloud(i, msg.text)} title={speakingIdx === i ? "Stop Reading" : "Read Aloud"} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}>
                              {speakingIdx === i ? <VolumeX size={13} className="text-violet-500" /> : <Volume2 size={13} />}
                            </button>
                            <button onClick={() => handleShareMsg(msg.text)} title="Share" className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}>
                              <Share2 size={13} />
                            </button>
                            <button onClick={() => handleDeleteMsg(i)} title="Delete" className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-zinc-500 hover:bg-red-50 hover:text-red-500' : 'text-zinc-500 hover:bg-red-500/10 hover:text-red-400'}`}>
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEditMsg(i, msg.text)} title="Edit" className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}>
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleCopyMsg(msg.text)} title="Copy" className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}>
                              <Copy size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4 fade-up">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLight ? 'bg-violet-100 text-violet-600 border border-violet-200' : 'bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/20 text-violet-300'}`}>
                  <Bot size={18} />
                </div>
                <div className={`px-4 sm:px-5 py-3 sm:py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 w-full sm:w-auto ${isLight ? 'bg-zinc-50 border border-zinc-200' : 'bg-zinc-800/40 border border-zinc-700/30'}`}>
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className="text-xs text-zinc-500 ml-1">Gemma4 thinking...</span>
                </div>
              </div>
            )}

            {messages.length <= 1 && !isTyping && (
              <div className="pt-4">
                {/* Multimodal capability hint */}
                <div className={`mb-4 p-3 rounded-xl border ${isLight ? 'bg-violet-50 border-violet-200' : 'bg-gradient-to-r from-violet-500/8 to-indigo-500/8 border-violet-500/15'}`}>
                  <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isLight ? 'text-violet-600' : 'text-violet-300'}`}>
                    <Eye size={12} /> Gemma4 Vision Capabilities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: Image,    label: 'Analyze Images', color: isLight ? 'text-blue-500' : 'text-blue-400' },
                      { icon: Video,    label: 'Understand Videos', color: isLight ? 'text-emerald-500' : 'text-emerald-400' },
                      { icon: FileText, label: 'Read Documents', color: isLight ? 'text-amber-500' : 'text-amber-400' },
                    ].map(({ icon: Icon, label, color }) => (
                      <span key={label} className={`flex items-center gap-1 text-[11px] ${color} px-2 py-1 rounded-lg border ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-800/60 border-zinc-700/50'}`}>
                        <Icon size={10} /> {label}
                      </span>
                    ))}
                  </div>
                </div>
                <p className={`text-xs mb-3 mentor-suggestions-title ${isLight ? 'text-zinc-500' : 'text-zinc-600'}`}>Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(s)}
                      className={`px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-1.5 mentor-suggestion-btn ${isLight ? 'bg-white border border-zinc-200 text-zinc-600 hover:text-violet-600 hover:border-violet-300 shadow-sm' : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-violet-400 hover:border-violet-500/20'}`}
                    >
                      <ChevronRight size={10} className={isLight ? 'text-zinc-400' : 'text-zinc-600'} /> {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className={`p-3 sm:p-4 border border-t-0 rounded-b-2xl mentor-input-wrapper flex flex-col gap-3 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800/60'}`}>

            {/* Attachment Preview */}
            {attachLoading && (
              <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-2 rounded-lg">
                <Loader2 size={14} className="animate-spin text-violet-400" />
                <span className="text-xs text-violet-300">Processing attachment...</span>
              </div>
            )}
            {attachment && !attachLoading && (
              <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-2 rounded-lg">
                {attachment.isImage && attachment.preview && (
                  <img src={attachment.preview} alt="preview" className="w-10 h-10 object-cover rounded-md border border-violet-500/30" />
                )}
                {attachment.isVideo && attachment.preview && (
                  <div className="relative w-10 h-10 rounded-md overflow-hidden border border-emerald-500/30">
                    <img src={attachment.preview} alt="video frame" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Video size={10} className="text-white" />
                    </div>
                  </div>
                )}
                {attachment.isDoc && <FileText size={18} className="text-amber-400 shrink-0" />}
                <span className="text-xs text-violet-300 flex-1 truncate">{attachment.name}</span>
                <span className="text-[10px] text-zinc-600 shrink-0">
                  {attachment.isImage ? 'Image' : attachment.isVideo ? 'Video (frame extracted)' : 'Document'}
                </span>
                <button onClick={() => setAttachment(null)} className="text-violet-400/60 hover:text-red-400 transition-colors ml-1">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 sm:gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={ACCEPTED_FILES}
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-violet-400 transition-colors flex-shrink-0"
                title="Attach image, video, or document"
              >
                <Paperclip size={18} />
              </button>
              <button
                onClick={handleVoiceInput}
                className={`p-2 transition-colors flex-shrink-0 ${recording ? 'text-red-500 animate-pulse' : isLight ? 'text-zinc-500 hover:text-violet-600' : 'text-zinc-400 hover:text-violet-400'}`}
                title={recording ? 'Stop recording' : 'Voice input'}
              >
                <Mic size={18} />
              </button>
              <input
                type="text"
                value={recording ? '🎤 Listening...' : input}
                onChange={e => !recording && setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={attachment ? `Ask about ${attachment.name}...` : 'Ask anything...'}
                className={`flex-1 min-w-0 rounded-xl px-3 sm:px-5 py-2.5 sm:py-3.5 text-sm sm:text-base focus:outline-none transition-all mentor-input ${isLight ? 'bg-white border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:border-violet-400' : 'bg-zinc-800/60 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-violet-500/50'}`}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !attachment) || isTyping}
                className={`px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-xl text-sm font-semibold transition-all mentor-send-btn shadow-lg flex-shrink-0 ${
                  (input.trim() || attachment) && !isTyping
                    ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-violet-900/40'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed shadow-none'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ── HISTORY TAB ── */
        <div className={`flex-1 flex flex-col border-x border-b rounded-b-2xl overflow-hidden mentor-chat-area ${isLight ? 'bg-white border-zinc-200' : 'border-zinc-800/60 bg-zinc-950/40'}`}>
          <div className={`flex items-center justify-between px-3 sm:px-5 py-3 border-b shrink-0 mentor-history-header ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/60'}`}>
            <p className={`text-xs font-medium ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {totalPairs > 0 ? `${totalPairs} past conversation${totalPairs > 1 ? 's' : ''}` : 'No past conversations yet'}
            </p>
            {totalPairs > 0 && (
              clearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Sure?</span>
                  <button
                    onClick={handleClearHistory}
                    disabled={clearing}
                    className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all font-semibold"
                  >
                    {clearing ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                    Yes, Clear All
                  </button>
                  <button onClick={() => setClearConfirm(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-white transition-all">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all"
                >
                  <Trash2 size={12} /> Clear History
                </button>
              )
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-violet-400" />
              </div>
            ) : historySessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/60 flex items-center justify-center mb-3">
                  <History size={20} className="text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-500 font-medium">No history yet</p>
                <p className="text-xs text-zinc-700 mt-1">Chat with your mentor and it'll appear here</p>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-violet-600/20 border border-violet-500/20 rounded-lg text-xs text-violet-400 hover:bg-violet-600/30 transition-all"
                >
                  <MessageSquare size={12} /> Start chatting
                </button>
              </div>
            ) : (
              historySessions.map(session => (
                <div key={session.sessionId} className={`rounded-xl border overflow-hidden ${isLight ? 'border-zinc-200' : 'border-zinc-800/60'}`}>
                  <button
                    onClick={() => toggleDate(session.sessionId)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors border-b mentor-history-date-btn ${isLight ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200' : 'bg-zinc-900/60 hover:bg-zinc-800/40 border-zinc-800/60'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                      <span className={`text-xs font-semibold mentor-history-date-text ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>{session.date}</span>
                      <span className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>{session.pairs.length} Q&A</span>
                    </div>
                    <span className="text-zinc-600 text-[10px]">{expandedDates.has(session.sessionId) ? '▲' : '▼'}</span>
                  </button>
                  {expandedDates.has(session.sessionId) && (
                    <div className={`divide-y ${isLight ? 'divide-zinc-200' : 'divide-zinc-800/50'}`}>
                      {session.pairs.map((pair, idx) => (
                        <div key={idx} className={`p-4 space-y-3 mentor-history-pair ${isLight ? 'bg-white' : 'bg-zinc-950/30'}`}>
                          <div className="flex gap-3 flex-row-reverse">
                            <div className="w-7 h-7 rounded-lg bg-violet-600/60 flex items-center justify-center shrink-0">
                              <User size={12} className="text-white" />
                            </div>
                            <div className="flex flex-col items-end gap-1 max-w-[80%]">
                              <div className={`px-3 py-2.5 rounded-xl rounded-tr-sm text-xs leading-relaxed mentor-user-bubble ${isLight ? 'bg-violet-50 border border-violet-100 text-zinc-700' : 'bg-violet-600/10 border border-violet-500/15 text-zinc-300'}`}>
                                {pair.question}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mentor-ai-avatar ${isLight ? 'bg-violet-100 text-violet-600' : 'bg-gradient-to-br from-violet-600/30 to-indigo-600/20 text-violet-400'}`}>
                              <Bot size={12} />
                            </div>
                            <div
                              className={`px-3 py-2.5 rounded-xl rounded-tl-sm text-xs leading-relaxed max-w-[80%] mentor-ai-bubble ${isLight ? 'bg-zinc-50 border border-zinc-200 text-zinc-700' : 'bg-zinc-800/40 border border-zinc-700/40 text-zinc-400'}`}
                              dangerouslySetInnerHTML={{ __html: renderMd(pair.answer) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
