"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { QuestionWithAnswer } from "@/lib/types";

interface Props {
  questions: QuestionWithAnswer[];
}

export default function SentimentChart({ questions }: Props) {
  const data = questions
    .filter((q) => q.answer?.sentiment_score != null)
    .map((q) => ({
      name: `Q${q.number}`,
      score: q.answer!.sentiment_score,
      label: q.answer!.sentiment_label,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        Sentiment Trajectory
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <YAxis domain={[-1, 1]} tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <Tooltip
            formatter={(val: number) => [val.toFixed(3), "Sentiment"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#e2e8f0" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#4f6ef7"
            strokeWidth={2}
            dot={{ r: 4, fill: "#4f6ef7" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2 text-center">
        −1 = very negative · 0 = neutral · +1 = very positive
      </p>
    </div>
  );
}
