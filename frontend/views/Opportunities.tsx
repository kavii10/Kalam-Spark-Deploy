import React, { useState } from "react";
import { UserProfile } from "../types";
import { Search, MapPin, Briefcase, ExternalLink, Zap, Star, ShieldCheck, RefreshCw, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { dbService } from "../dbService";

interface Props {
  user: UserProfile;
}

interface Opportunity {
  type: string;
  title: string;
  company: string;
  location: string;
  requiredSkills: string[];
  matchPercentage: number;
  actionText: string;
  searchUrl: string;
  platform: string;
}

const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  return "http://localhost:8000";
};
const BACKEND_URL = getBackendUrl();

const typeColors: Record<string, string> = {
  'Internship': 'text-blue-400',
  'Job': 'text-emerald-400',
  'Hackathon': 'text-purple-400',
  'Freelance': 'text-amber-400',
};

const typeBadgeBg: Record<string, string> = {
  'Internship': 'rgba(59,130,246,0.12)',
  'Job': 'rgba(52,211,153,0.12)',
  'Hackathon': 'rgba(124,58,237,0.12)',
  'Freelance': 'rgba(251,191,36,0.12)',
};

export default function Opportunities({ user }: Props) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
    const saved = sessionStorage.getItem('kalamspark_radar');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(() => {
    return !!sessionStorage.getItem('kalamspark_radar');
  });
  const [error, setError] = useState("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const isLight = user.settings?.theme === 'light';

  // Clear cache if dream changes
  React.useEffect(() => {
    const cachedDream = sessionStorage.getItem('kalamspark_radar_dream');
    if (cachedDream && cachedDream !== user.dream) {
      sessionStorage.removeItem('kalamspark_radar');
      setOpportunities([]);
      setHasScanned(false);
    }
    sessionStorage.setItem('kalamspark_radar_dream', user.dream || '');
  }, [user.dream]);

  const scanWeb = async () => {
    setLoading(true);
    setHasScanned(true);
    setError("");

    try {
      // Roadmap data is stored in Supabase — fetch it directly from dbService
      const currentRoadmap = await dbService.getRoadmap(user.id).catch(() => null);
      const stageCount = Math.max(1, user.currentStageIndex);
      const currentSkills = currentRoadmap?.stages
        ?.slice(0, stageCount)
        .flatMap((s: any) => s.skills || [])
        .filter(Boolean)
        .join(", ") || user.branch || "General Knowledge";

      const res = await fetch(`${BACKEND_URL}/api/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dream: user.dream,
          branch: user.branch || "",
          year: user.year || "",
          current_skills: currentSkills,
          stage_index: user.currentStageIndex || 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Backend error ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setOpportunities(data);
        sessionStorage.setItem('kalamspark_radar', JSON.stringify(data));
      } else {
        throw new Error("No opportunities returned");
      }
    } catch (e: any) {
      console.error("Radar scan failed:", e);
      setError(e.message);
      const dream = user.dream || "professional";
      const branch = user.branch || "General";
      const fallbackOpps = [
        { 
          type: 'Internship', 
          title: `${dream} Intern`, 
          company: 'Industry Partner Companies', 
          location: 'Remote / Hybrid', 
          requiredSkills: [branch, 'Eagerness to Learn', 'Basic Domain Knowledge'], 
          matchPercentage: 85, 
          actionText: 'Apply on Internshala', 
          platform: 'internshala', 
          searchUrl: `https://internshala.com/internships/${encodeURIComponent(dream.toLowerCase().replace(/\s+/g, '-'))}-internship` 
        },
        { 
          type: 'Job', 
          title: `Junior ${dream} Role`, 
          company: 'Naukri Listed Startups', 
          location: 'Pan India / Remote', 
          requiredSkills: ['Basic Domain Knowledge', 'Communication', branch], 
          matchPercentage: 78, 
          actionText: 'Search on Naukri', 
          platform: 'naukri', 
          searchUrl: `https://www.naukri.com/${encodeURIComponent(dream.toLowerCase().replace(/\s+/g, '-'))}-jobs` 
        },
        { 
          type: 'Internship', 
          title: `${dream} Trainee`, 
          company: 'LinkedIn Partner Companies', 
          location: 'India (Multiple Cities)', 
          requiredSkills: ['Fresher Friendly', 'Domain Basics', 'Communication'], 
          matchPercentage: 82, 
          actionText: 'Apply on LinkedIn', 
          platform: 'linkedin', 
          searchUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(dream)}&location=India&f_E=1` 
        },
        { 
          type: 'Freelance', 
          title: `Freelance ${dream} Projects`, 
          company: 'Freelancer.in', 
          location: 'Online', 
          requiredSkills: ['Portfolio', 'Self-Management', 'Communication'], 
          matchPercentage: 74, 
          actionText: 'Browse Projects', 
          platform: 'freelancer', 
          searchUrl: `https://www.freelancer.in/jobs/${encodeURIComponent(dream.toLowerCase().replace(/\s+/g, '-'))}/` 
        },
      ];
      
      // Only add SIH if dream is tech-related
      const isTech = /software|developer|engineer|ai|tech|cs|it/i.test(dream);
      if (isTech) {
        fallbackOpps.push({ 
          type: 'Hackathon', 
          title: 'Smart India Hackathon 2025', 
          company: 'Ministry of Education, Govt. of India', 
          location: 'Pan India', 
          requiredSkills: ['Teamwork', 'Innovation', 'Problem Solving'], 
          matchPercentage: 90, 
          actionText: 'Register on SIH Portal', 
          platform: 'sih', 
          searchUrl: 'https://www.sih.gov.in/' 
        });
      } else {
        fallbackOpps.push({ 
          type: 'Hackathon', 
          title: `${dream} Innovation Challenge`, 
          company: 'Unstop Community', 
          location: 'Online', 
          requiredSkills: ['Creativity', branch, 'Presentation'], 
          matchPercentage: 88, 
          actionText: 'Browse on Unstop', 
          platform: 'unstop', 
          searchUrl: `https://unstop.com/hackathons?search=${encodeURIComponent(dream)}` 
        });
      }
      setOpportunities(fallbackOpps);
      sessionStorage.setItem('kalamspark_radar', JSON.stringify(fallbackOpps));
    }

    setLoading(false);
  };

  return (
    <div className="w-full space-y-6 pb-20 animate-in fade-in duration-500">

      {/* Header */}
      <div className={`glass-card p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b ${isLight ? 'border-orange-200 bg-white' : 'border-orange-500/30'}`}>
        <div className="flex-1">
          <h1 className={`text-3xl font-cinzel font-bold mb-2 flex items-center gap-3 ${isLight ? 'text-orange-500' : 'text-orange-400'}`}>
            <Search size={28} /> Opportunity Radar
          </h1>
          <p className={`text-sm max-w-xl mb-4 ${isLight ? 'text-zinc-600' : 'text-gold-200/60'}`}>
            The AI radar scans for open internships, hackathons, and jobs matching your skills — with direct links to real platforms like LinkedIn, Internshala, Naukri, and Unstop.
          </p>

          {/* How it works toggle */}
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className={`flex items-center gap-2 text-xs transition-colors font-semibold uppercase tracking-widest ${isLight ? 'text-amber-600 hover:text-amber-700' : 'text-gold-400/60 hover:text-gold-300'}`}
          >
            <Info size={13} />
            How the Radar Works
            {showHowItWorks ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showHowItWorks && (
            <div className={`mt-3 border rounded-xl p-4 text-xs leading-relaxed space-y-2 max-w-lg animate-in fade-in duration-300 ${isLight ? 'bg-amber-500/10 border-amber-500/20 text-amber-900/80' : 'bg-black/30 border-gold-500/15 text-gold-300/70'}`}>
              <p><span className={isLight ? "text-amber-700 font-bold" : "text-gold-400 font-bold"}>① Profile Match</span> — Your dream career, academic branch, education level, and verified skills from your roadmap are extracted.</p>
              <p><span className={isLight ? "text-amber-700 font-bold" : "text-gold-400 font-bold"}>② Local AI Analysis</span> — Our local <span className="text-purple-400">Gemma4</span> model (via Ollama) generates 6 highly relevant, curated opportunities from its training knowledge of the Indian job market.</p>
              <p><span className={isLight ? "text-amber-700 font-bold" : "text-gold-400 font-bold"}>③ Real Platform Links</span> — Each opportunity is mapped to its actual platform (Internshala, Naukri, LinkedIn, Unstop, SIH, Freelancer.in) with a direct search URL pre-filtered for your career.</p>
              <p><span className={isLight ? "text-amber-700 font-bold" : "text-gold-400 font-bold"}>④ Zero API Limits</span> — Runs fully on your local backend. No rate limits, no external API calls, fully private.</p>
            </div>
          )}
        </div>

        <button
          onClick={scanWeb}
          disabled={loading}
          className="btn-primary py-4 px-8 shadow-[0_0_20px_rgba(255,140,66,0.5)] flex items-center gap-2 min-w-[200px] justify-center flex-shrink-0"
        >
          {loading ? <><RefreshCw size={18} className="animate-spin" /> Scanning...</> : <><Zap size={18} /> Run Radar Sweep</>}
        </button>
      </div>

      {/* Error notice */}
      {error && hasScanned && (
        <div className={`glass-card p-4 flex items-start gap-3 ${isLight ? 'border-amber-200 bg-amber-50' : 'border-amber-500/20 bg-amber-500/5'}`}>
          <AlertCircle size={16} className={`${isLight ? 'text-amber-500' : 'text-amber-400'} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <p className={`text-xs font-semibold ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>Radar Sweep Info</p>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-400/70'}`}>{error}</p>
            {error.toLowerCase().includes('fetch') && (
              <p className={`text-[10px] mt-1 italic ${isLight ? 'text-amber-500' : 'text-amber-500/50'}`}>Suggestion: Check if your local AI backend is running (uvicorn main:app).</p>
            )}
          </div>
        </div>
      )}

      {/* Initial state */}
      {!hasScanned && !loading && (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <div className={`w-32 h-32 rounded-full border border-dashed animate-[spin_10s_linear_infinite] flex items-center justify-center mb-6 ${isLight ? 'border-orange-300' : 'border-gold-500/30'}`}>
            <Search size={40} className={isLight ? "text-orange-400" : "text-gold-500/50"} />
          </div>
          <p className={`text-sm font-bold uppercase tracking-widest ${isLight ? 'text-orange-600' : 'text-gold-200'}`}>Radar Offline</p>
          <p className={`text-xs mt-2 ${isLight ? 'text-zinc-500' : 'text-gold-500/50'}`}>Run a sweep to find matching opportunities with direct links.</p>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className={`glass-card p-6 h-52 animate-pulse rounded-2xl ${isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-white/5 border-gold-500/10'}`}></div>
          ))}
        </div>
      )}

      {/* Results grid */}
      {!loading && opportunities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {opportunities.map((opp, idx) => (
            <div key={idx} className={`border rounded-2xl p-6 relative transition-all group flex flex-col h-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${isLight ? 'bg-white border-orange-200 hover:border-orange-400 hover:shadow-xl' : 'bg-black/60 border-gold-500/20 hover:border-orange-500/50 hover:shadow-[0_4px_30px_rgba(255,140,66,0.1)]'}`}>
              {/* Match Badge */}
              <div className={`absolute top-4 right-4 border px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isLight ? 'bg-orange-50 border-orange-200 text-orange-500' : 'bg-orange-500/10 border-orange-500/40 text-orange-400'}`}>
                <ShieldCheck size={13} /> {opp.matchPercentage}% Match
              </div>

              {/* Type badge */}
              <span
                className={`text-[10px] font-bold uppercase tracking-widest mb-2 inline-block px-2 py-0.5 rounded-full w-fit ${typeColors[opp.type] || (isLight ? 'text-gold-600' : 'text-gold-400')}`}
                style={{ background: typeBadgeBg[opp.type] || (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)') }}
              >
                {opp.type}
              </span>
              <h3 className={`text-xl font-bold mb-1 pr-24 ${isLight ? 'text-zinc-800' : 'text-gold-100'}`}>{opp.title}</h3>

              <div className={`flex flex-wrap items-center gap-3 text-xs mb-5 font-medium ${isLight ? 'text-zinc-500' : 'text-gold-500/60'}`}>
                <span className="flex items-center gap-1"><Briefcase size={13} className={isLight ? 'text-zinc-400' : 'text-gold-500/40'} /> {opp.company}</span>
                <span className="flex items-center gap-1"><MapPin size={13} className={isLight ? 'text-zinc-400' : 'text-gold-500/40'} /> {opp.location}</span>
              </div>

              <div className="flex-1">
                <p className={`text-xs font-bold mb-2 opacity-60 uppercase tracking-wider ${isLight ? 'text-zinc-600' : 'text-gold-300'}`}>Required Skills</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {opp.requiredSkills?.map((skill: string, sIdx: number) => (
                    <span key={sIdx} className={`border px-3 py-1 rounded-md text-xs flex items-center gap-1 ${isLight ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-white/5 border-gold-500/20 text-gold-200'}`}>
                      <Star size={9} className={isLight ? 'text-orange-500' : 'text-gold-500'} /> {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Real external link */}
              <a
                href={opp.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-auto w-full py-3 border rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${isLight ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 hover:border-orange-400 text-orange-600' : 'bg-white/5 hover:bg-orange-500/20 border-gold-500/20 hover:border-orange-500/50 text-gold-200'}`}
              >
                {opp.actionText} <ExternalLink size={15} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
