"use client";

interface Keyword {
  word: string;
  score: number;
}

interface Props {
  keywords: Keyword[];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function KeywordCloud({ keywords }: Props) {
  if (!keywords || keywords.length === 0) return null;

  const max = Math.max(...keywords.map((k) => k.score));
  const min = Math.min(...keywords.map((k) => k.score));
  const range = max - min || 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Key Topics</h3>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => {
          const t = (kw.score - min) / range;
          const size = Math.round(lerp(13, 20, t));
          const opacity = lerp(0.5, 1, t);
          return (
            <span
              key={kw.word}
              style={{ fontSize: size, opacity }}
              className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full font-medium cursor-default"
              title={`TF-IDF: ${kw.score.toFixed(4)}`}
            >
              {kw.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
