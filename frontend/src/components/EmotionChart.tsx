"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Emotion } from "@/lib/types";

const EMOTION_COLORS: Record<string, string> = {
  joy:      "#10b981",
  surprise: "#f59e0b",
  neutral:  "#94a3b8",
  sadness:  "#6366f1",
  fear:     "#8b5cf6",
  disgust:  "#f97316",
  anger:    "#ef4444",
};

interface Props {
  emotions: Emotion[];
}

export default function EmotionChart({ emotions }: Props) {
  if (!emotions || emotions.length === 0) return null;

  const data = emotions.map((e) => ({
    name: `${e.emoji ?? ""} ${e.label}`,
    score: Math.round(e.score * 100),
    label: e.label,
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Emotion Profile</h3>
      <ResponsiveContainer width="100%" height={Math.max(100, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tick={{ fontSize: 12, fill: "#475569" }}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, "Avg. confidence"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={EMOTION_COLORS[entry.label] ?? "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
