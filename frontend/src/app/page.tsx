"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const PRESET_TOPICS = [
  "AI in the Workplace",
  "Scientific Research Methods",
  "Entrepreneurship & Innovation",
  "Ethics in Technology",
];

const PERSONAS = [
  { id: "neutral",    label: "Neutral",    description: "Balanced, open-ended questions" },
  { id: "academic",   label: "Academic",   description: "Theoretical depth, evidence-focused" },
  { id: "journalist", label: "Journalist", description: "Direct, fact-checking, probing" },
  { id: "coach",      label: "Coach",      description: "Reflective, growth-oriented" },
] as const;

type PersonaId = typeof PERSONAS[number]["id"];

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic]               = useState("");
  const [numQuestions, setNumQuestions] = useState(4);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature]   = useState(0.7);
  const [persona, setPersona]           = useState<PersonaId>("neutral");

  async function startInterview(selectedTopic: string) {
    const t = selectedTopic.trim();
    if (!t) return;
    setLoading(true);
    setError("");
    try {
      const interview = await api.createInterview(t, numQuestions, temperature, persona);
      router.push(`/interview/${interview.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  const tempLabel =
    temperature <= 0.4 ? "Focused" :
    temperature <= 0.7 ? "Balanced" :
    "Creative";

  return (
    <div className="animate-fade-in pt-2">

      {/* Centered logo + heading */}
      <div className="flex flex-col items-center text-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Intervue AI" className="w-14 h-14 mb-4" />
        <h1 className="text-2xl font-semibold text-warm-950 mb-1">Start an interview</h1>
        <p className="text-sm text-warm-600 leading-relaxed max-w-sm">
          Choose a topic or write your own. The AI will conduct a short interview
          and analyse your responses.
        </p>
      </div>

      {/* Main input */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startInterview(topic)}
            placeholder="What would you like to discuss?"
            className="flex-1 px-4 py-3 rounded-xl border border-warm-300 bg-white text-sm
                       text-warm-950 placeholder:text-warm-400 focus:outline-none
                       focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
          />
          <button
            onClick={() => startInterview(topic)}
            disabled={loading || !topic.trim()}
            className="px-5 py-3 bg-brand-500 text-white rounded-xl text-sm font-medium
                       hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Starting…" : "Start"}
          </button>
        </div>
      </div>

      {/* Question count + settings toggle row */}
      <div className="flex items-center gap-3 mb-2 px-1">
        <span className="text-xs text-warm-500 whitespace-nowrap">
          Questions: <span className="font-semibold text-warm-700">{numQuestions}</span>
        </span>
        <input
          type="range"
          min={3}
          max={5}
          value={numQuestions}
          onChange={(e) => setNumQuestions(Number(e.target.value))}
          className="flex-1 accent-brand-500"
        />
        <span className="text-xs text-warm-400">3–5</span>

        <button
          onClick={() => setShowSettings((v) => !v)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ml-1 ${
            showSettings
              ? "bg-warm-200 border-warm-300 text-warm-800"
              : "border-warm-200 text-warm-500 hover:border-warm-300 hover:text-warm-700"
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          LLM settings
          {(temperature !== 0.7 || persona !== "neutral") && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 ml-0.5" />
          )}
        </button>
      </div>

      {/* Collapsible settings panel */}
      {showSettings && (
        <div className="mb-5 bg-white border border-warm-200 rounded-xl p-4 space-y-4 animate-fade-in">

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-warm-700">Creativity</span>
              <span className="text-xs font-semibold text-brand-500">{tempLabel} · {temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={1.0}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-warm-400 mt-1 px-0.5">
              <span>Focused</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Persona */}
          <div>
            <span className="text-xs font-medium text-warm-700 block mb-2">Interviewer style</span>
            <div className="grid grid-cols-2 gap-1.5">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    persona === p.id
                      ? "bg-brand-50 border-brand-300 text-brand-700"
                      : "bg-warm-50 border-warm-200 text-warm-700 hover:border-warm-300 hover:text-warm-900"
                  }`}
                >
                  <span className="font-medium block">{p.label}</span>
                  <span className="text-[10px] text-warm-400 leading-tight">{p.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 border-t border-warm-200" />
        <span className="text-xs text-warm-400">or pick a topic</span>
        <div className="flex-1 border-t border-warm-200" />
      </div>

      {/* Preset topics */}
      <div className="space-y-1.5">
        {PRESET_TOPICS.map((t) => (
          <button
            key={t}
            onClick={() => startInterview(t)}
            disabled={loading}
            className="w-full text-left px-4 py-3 rounded-xl bg-white border border-warm-200
                       text-sm text-warm-700 hover:bg-warm-100 hover:border-warm-300
                       hover:text-warm-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-5 text-center text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}
