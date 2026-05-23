"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { QuestionWithAnswer, SummaryOut } from "@/lib/types";
import SentimentChart from "@/components/SentimentChart";
import KeywordCloud from "@/components/KeywordCloud";
import EmotionChart from "@/components/EmotionChart";

type Phase =
  | "intro"
  | "loading"
  | "streaming-question"
  | "awaiting-answer"
  | "streaming-summary"
  | "done"
  | "error";

const EMOTION_EMOJI: Record<string, string> = {
  joy: "😊", surprise: "😮", neutral: "😐",
  sadness: "😢", fear: "😰", disgust: "🤢", anger: "😠",
};

const SENTIMENT_STYLES: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral:  "bg-warm-100 text-warm-600",
  negative: "bg-red-100 text-red-600",
};

function aggregateEmotions(qas: QuestionWithAnswer[]): { label: string; score: number; emoji?: string }[] {
  const totals: Record<string, number> = {};
  const emojis: Record<string, string> = {};
  let count = 0;
  for (const q of qas) {
    if (q.answer?.emotions?.length) {
      count++;
      for (const e of q.answer.emotions) {
        totals[e.label] = (totals[e.label] ?? 0) + e.score;
        if (e.emoji) emojis[e.label] = e.emoji;
      }
    }
  }
  if (count === 0) return [];
  return Object.entries(totals)
    .map(([label, total]) => ({ label, score: total / count, emoji: emojis[label] }))
    .filter((e) => e.score > 0.01)
    .sort((a, b) => b.score - a.score);
}

function EmotionBadges({ emotions }: { emotions: { label: string; score: number; emoji?: string }[] | null }) {
  if (!emotions || emotions.length === 0) return null;
  const top = emotions.slice(0, 3).filter((e) => e.score > 0.08);
  if (top.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {top.map((e) => (
        <span
          key={e.label}
          title={`${(e.score * 100).toFixed(1)}% confidence`}
          className="text-xs bg-warm-100 text-warm-700 px-2 py-0.5 rounded-full"
        >
          {e.emoji ?? EMOTION_EMOJI[e.label] ?? ""} {e.label}
        </span>
      ))}
    </div>
  );
}

function SentimentBadge({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SENTIMENT_STYLES[label] ?? SENTIMENT_STYLES.neutral}`}>
      {label}
    </span>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-1 16.93V21h2v-1.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/>
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ""}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  );
}

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [topic, setTopic]                         = useState("");
  const [numQuestions, setNumQuestions]           = useState(4);
  const [completedQAs, setCompletedQAs]           = useState<QuestionWithAnswer[]>([]);
  const [streamingQuestion, setStreamingQuestion] = useState("");
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answer, setAnswer]                       = useState("");
  const [phase, setPhase]                         = useState<Phase>("loading");
  const [summary, setSummary]                     = useState<SummaryOut | null>(null);
  const [summaryText, setSummaryText]             = useState("");
  const [error, setError]                         = useState("");
  const [isExiting, setIsExiting]                 = useState(false);
  const [cardKey, setCardKey]                     = useState(0);
  const [isLoadingNext, setIsLoadingNext]         = useState(false);
  const [isListening, setIsListening]             = useState(false);

  const esRef          = useRef<EventSource | null>(null);
  const didInit        = useRef(false);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const exitTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    api.getInterview(id)
      .then((iv) => {
        setTopic(iv.topic);
        setNumQuestions(iv.num_questions);
        if (iv.status === "completed" && iv.summary) {
          setCompletedQAs(iv.questions);
          setSummary(iv.summary);
          setPhase("done");
        } else {
          setCompletedQAs(iv.questions.filter((q) => q.answer));
          setPhase("intro");
        }
      })
      .catch(() => { setError("Interview not found."); setPhase("error"); });

    return () => {
      esRef.current?.close();
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      recognitionRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (phase === "awaiting-answer") textareaRef.current?.focus();
  }, [phase]);

  function streamQuestion() {
    esRef.current?.close();
    setStreamingQuestion("");
    setCurrentQuestionId(null);
    setPhase("streaming-question");

    const es = new EventSource(`/api/interviews/${id}/stream-question`);
    esRef.current = es;

    es.onmessage = (e) => {
      const raw = e.data as string;
      if (raw === "[DONE]")                { es.close(); setPhase("awaiting-answer"); return; }
      if (raw.startsWith("[QUESTION_ID:")) { setCurrentQuestionId(raw.slice(13, -1)); return; }
      if (raw.startsWith("[ERROR]"))       { es.close(); setError(raw); setPhase("error"); return; }
      setStreamingQuestion((prev) => prev + raw);
    };

    es.onerror = () => { es.close(); setError("Connection lost. Please refresh."); setPhase("error"); };
  }

  async function handleNextClick() {
    if (isLoadingNext || isExiting || !answer.trim() || !currentQuestionId || phase !== "awaiting-answer") return;

    recognitionRef.current?.abort();
    setIsListening(false);
    setIsLoadingNext(true);

    let savedAnswer;
    try {
      savedAnswer = await api.submitAnswer(id, currentQuestionId, answer.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save answer. Please try again.");
      setIsLoadingNext(false);
      return;
    }

    const newQA: QuestionWithAnswer = {
      id: currentQuestionId,
      number: completedQAs.length + 1,
      text: streamingQuestion.trim(),
      answer: savedAnswer,
    };
    const updated = [...completedQAs, newQA];

    if (updated.length >= numQuestions) {
      setIsLoadingNext(false);
      setIsExiting(true);
      exitTimerRef.current = setTimeout(() => {
        setIsExiting(false);
        setCompletedQAs(updated);
        setAnswer("");
        streamSummary();
      }, 390);
      return;
    }

    esRef.current?.close();
    let bufferedText = "";
    let bufferedId   = "";

    const es = new EventSource(`/api/interviews/${id}/stream-question`);
    esRef.current = es;

    es.onmessage = (e) => {
      const raw = e.data as string;

      if (raw === "[DONE]") {
        es.close();
        setIsLoadingNext(false);
        setIsExiting(true);
        exitTimerRef.current = setTimeout(() => {
          setIsExiting(false);
          setCardKey((k) => k + 1);
          setCompletedQAs(updated);
          setAnswer("");
          setStreamingQuestion(bufferedText);
          setCurrentQuestionId(bufferedId);
          setPhase("awaiting-answer");
        }, 390);
        return;
      }

      if (raw.startsWith("[QUESTION_ID:")) { bufferedId = raw.slice(13, -1); return; }
      if (raw.startsWith("[ERROR]")) {
        es.close();
        setIsLoadingNext(false);
        setError(raw);
        setPhase("error");
        return;
      }

      bufferedText += raw;
    };

    es.onerror = () => {
      es.close();
      setIsLoadingNext(false);
      setError("Connection lost. Please refresh.");
      setPhase("error");
    };
  }

  function streamSummary() {
    esRef.current?.close();
    setSummaryText("");
    setPhase("streaming-summary");

    const es = new EventSource(`/api/interviews/${id}/stream-summary`);
    esRef.current = es;

    es.onmessage = (e) => {
      const raw = e.data as string;
      if (raw === "[DONE]") {
        es.close();
        api.getInterview(id).then((iv) => { setSummary(iv.summary); setCompletedQAs(iv.questions); setPhase("done"); });
        return;
      }
      if (raw.startsWith("[ERROR]")) { es.close(); setError(raw); setPhase("error"); return; }
      setSummaryText((prev) => prev + raw);
    };

    es.onerror = () => { es.close(); setError("Connection lost during summary."); setPhase("error"); };
  }

  function toggleVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice recognition is not supported in your browser. Try Chrome."); return; }

    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.continuous     = true;
    recognition.interimResults = false;
    recognition.lang           = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText) {
        setAnswer((prev) => {
          const spacer = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
          return prev + spacer + finalText;
        });
      }
    };

    recognition.onend   = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  const currentStep    = completedQAs.length;
  const remaining      = numQuestions - currentStep - 1;
  const progressPct    = (currentStep / numQuestions) * 100;
  const isLastQuestion = currentStep + 1 === numQuestions;

  // ── Intro view ─────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="max-w-xl mx-auto animate-fade-in">
        <div
          className="bg-white rounded-2xl border border-warm-200 overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(217,119,87,0.10), 0 2px 8px rgba(0,0,0,0.05)" }}
        >
          <div className="px-7 pt-7 pb-5 border-b border-warm-100">
            <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3"/>
                <circle cx="4"  cy="6"  r="2"/><line x1="6"  y1="7"  x2="10" y2="10"/>
                <circle cx="20" cy="6"  r="2"/><line x1="18" y1="7"  x2="14" y2="10"/>
                <circle cx="4"  cy="18" r="2"/><line x1="6"  y1="17" x2="10" y2="14"/>
                <circle cx="20" cy="18" r="2"/><line x1="18" y1="17" x2="14" y2="14"/>
                <circle cx="12" cy="3"  r="2"/><line x1="12" y1="5"  x2="12" y2="9"/>
                <circle cx="12" cy="21" r="2"/><line x1="12" y1="19" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-xs text-warm-400 uppercase tracking-wider mb-1">Intervue AI</p>
            <h1 className="text-xl font-semibold text-warm-950 leading-snug">
              A conversation on<br />
              <span className="text-brand-500">{topic}</span>
            </h1>
          </div>

          <div className="px-7 py-6 space-y-3 text-sm text-warm-700 leading-relaxed">
            <p>I&apos;ll ask you <strong className="text-warm-900">{numQuestions} questions</strong> to explore your thoughts on <em>{topic}</em>.</p>
            <p>Take your time! There&apos;s no rush and no wrong answers. Longer, thoughtful responses give the richest results.</p>
            <p>You can type or use the <strong className="text-warm-900">microphone button</strong> for voice dictation.</p>
            <p className="text-warm-400 text-xs pt-1">Estimated time: {Math.ceil(numQuestions * 1.2)}–{numQuestions * 2} minutes</p>
          </div>

          <div className="px-7 py-5 bg-warm-50/60 border-t border-warm-100">
            <button
              onClick={() => streamQuestion()}
              className="w-full py-3 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 active:scale-[0.99] transition-all"
            >
              Let&apos;s begin →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Summary view ───────────────────────────────────────────────────────────
  if (phase === "streaming-summary" || phase === "done") {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-warm-400 mb-1">Interview complete</p>
          <h1 className="text-2xl font-semibold text-warm-950">{topic}</h1>
        </div>

        <details className="bg-white rounded-xl border border-warm-200 overflow-hidden">
          <summary className="px-5 py-3 text-sm font-medium text-warm-600 cursor-pointer hover:bg-warm-50 select-none">
            View full transcript ({numQuestions} Q&amp;As)
          </summary>
          <div className="divide-y divide-warm-100">
            {completedQAs.map((q) => (
              <div key={q.id} className="px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide">Question {q.number}</p>
                <p className="text-sm text-warm-800">{q.text}</p>
                {q.answer && (
                  <div className="ml-3 pl-3 border-l-2 border-warm-200">
                    <p className="text-sm text-warm-700">{q.answer.text}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <SentimentBadge label={q.answer.sentiment_label} />
                      <EmotionBadges emotions={q.answer.emotions ?? null} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>

        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <h2 className="text-xs font-semibold text-warm-500 mb-3 uppercase tracking-widest">Summary</h2>
          <p className="text-sm text-warm-800 leading-relaxed whitespace-pre-wrap">
            {phase === "streaming-summary" ? summaryText : summary?.text}
            {phase === "streaming-summary" && (
              <span className="inline-block w-0.5 h-4 bg-brand-500 ml-0.5 animate-pulse align-middle" />
            )}
          </p>

          {phase === "done" && summary && (
            <div className="mt-5 space-y-4">
              {summary.themes && summary.themes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-warm-400 mb-2 uppercase tracking-wide">Themes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.themes.map((t) => (
                      <span key={t} className="text-xs bg-warm-100 text-warm-700 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <EmotionChart emotions={aggregateEmotions(completedQAs)} />
              <SentimentChart questions={completedQAs} />
              {summary.keywords && <KeywordCloud keywords={summary.keywords} />}
              <div className="flex gap-3 pt-1">
                <button onClick={() => api.exportInterview(id)}
                  className="flex-1 py-2.5 text-sm font-medium bg-white border border-warm-200 rounded-lg hover:border-warm-400 hover:text-warm-900 transition-colors">
                  Export JSON
                </button>
                <button onClick={() => router.push("/")}
                  className="flex-1 py-2.5 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                  New Interview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Active interview view ──────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto animate-fade-in">

      <p className="text-xs uppercase tracking-wider text-warm-400 mb-8">{topic}</p>

      <div className="relative mb-8" style={{ padding: "20px" }}>

        {/* Single ghost card */}
        {remaining >= 1 && (
          <div
            className="absolute rounded-2xl bg-white border border-warm-200"
            style={{
              top: "20px",
              left: "20px",
              right: "20px",
              bottom: "20px",
              zIndex: 20,
              opacity: 0.7,
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              transform: isExiting
                ? "translate(0,0) rotate(0deg)"
                : "translate(0, 0) rotate(-5deg)",
              transition: isExiting
                ? "transform 0.38s cubic-bezier(0.34,1.2,0.64,1), opacity 0.3s ease"
                : "transform 0.15s ease, opacity 0.15s ease",
            }}
          />
        )}

        {/* Active card */}
        <div
          key={cardKey}
          className="relative rounded-2xl bg-white border border-warm-200 overflow-hidden"
          style={{
            zIndex: 30,
            boxShadow: "0 8px 32px rgba(217,119,87,0.10), 0 2px 8px rgba(0,0,0,0.05)",
            animation: isExiting
              ? "cardExit 0.38s cubic-bezier(0.4,0,0.2,1) forwards"
              : cardKey > 0
                ? "cardEnter 0.44s cubic-bezier(0.34,1.4,0.64,1) both"
                : undefined,
            pointerEvents: isExiting ? "none" : undefined,
          }}
        >
          {/* Progress bar */}
          <div className="h-0.5 w-full bg-warm-100">
            <div
              className="h-full bg-brand-400 rounded-r-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Card header */}
          <div className="flex items-center gap-2 px-6 pt-5 pb-1">
            <span className="text-xs font-semibold text-warm-400 uppercase tracking-widest">
              Question {currentStep + 1}
            </span>
            {remaining > 0 && (
              <span className="ml-auto text-xs text-warm-300 tabular-nums">
                {remaining} more
              </span>
            )}
          </div>

          {/* Question text */}
          <p className="px-6 pt-3 pb-6 text-[1.1rem] text-warm-950 leading-relaxed font-medium min-h-[4rem]">
            {streamingQuestion || (phase === "loading" && "Loading…")}
            {phase === "streaming-question" && (
              <span className="inline-block w-0.5 h-5 bg-brand-400 ml-0.5 animate-pulse align-middle" />
            )}
          </p>

          {/* Answer section */}
          {phase === "awaiting-answer" && (
            <div className="animate-fade-in mx-6 mb-6 rounded-xl border border-warm-200 overflow-hidden bg-white">
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleNextClick(); }}
                placeholder={isListening ? "Listening…" : "Your answer…"}
                rows={4}
                className="w-full px-4 pt-4 pb-3 text-sm text-warm-900 resize-none focus:outline-none placeholder:text-warm-400 leading-relaxed bg-transparent"
              />
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-warm-100 bg-warm-50/60">
                <button
                  type="button"
                  onClick={toggleVoice}
                  title={isListening ? "Stop recording" : "Start voice dictation"}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                  style={isListening ? {
                    backgroundColor: "rgb(239,68,68)", color: "white",
                    animation: "micPulse 1.4s ease infinite",
                  } : {
                    backgroundColor: "rgb(238,234,223)", color: "rgb(106,101,95)",
                  }}
                >
                  <MicIcon className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-warm-400 mx-3 flex-1">
                  {isListening ? "Recording…" : answer.length > 0 ? `${answer.length} chars` : "Ctrl+Enter to submit"}
                </span>
                <button
                  onClick={handleNextClick}
                  disabled={!answer.trim() || isExiting || isLoadingNext}
                  className="px-5 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoadingNext ? (
                    <>
                      <Spinner className="w-3.5 h-3.5" />
                      <span>Loading…</span>
                    </>
                  ) : (
                    isLastQuestion ? "Finish →" : "Next →"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Previous answers */}
      {completedQAs.length > 0 && (
        <details>
          <summary className="text-xs text-warm-400 cursor-pointer hover:text-warm-600 select-none">
            Previous answers ({completedQAs.length})
          </summary>
          <div className="mt-3 space-y-3">
            {completedQAs.map((q) => (
              <div key={q.id} className="bg-white rounded-xl p-4 border border-warm-200">
                <p className="text-xs font-semibold text-brand-500 mb-1">Q{q.number}</p>
                <p className="text-xs text-warm-500 mb-2">{q.text}</p>
                <p className="text-sm text-warm-800">{q.answer?.text}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <SentimentBadge label={q.answer?.sentiment_label ?? null} />
                  <EmotionBadges emotions={q.answer?.emotions ?? null} />
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {error && <p className="mt-6 text-center text-red-500 text-sm">{error}</p>}
    </div>
  );
}
