"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { InterviewListItem } from "@/lib/types";

export default function HistoryPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listInterviews().then((data) => {
      setInterviews(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-warm-400 text-sm">
        Loading…
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <p className="text-warm-500 mb-5">No interviews yet.</p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          Start your first interview
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold text-warm-950 mb-6">All interviews</h1>
      <div className="space-y-2">
        {interviews.map((iv) => (
          <button
            key={iv.id}
            onClick={() => router.push(`/interview/${iv.id}`)}
            className="w-full text-left bg-white rounded-xl border border-warm-200 px-5 py-4
                       hover:border-warm-300 hover:shadow-sm transition-all flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-warm-950 truncate text-sm">{iv.topic}</p>
              <p className="text-xs text-warm-500 mt-0.5">
                {new Date(iv.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
                {" · "}
                {iv.num_questions} question{iv.num_questions !== 1 ? "s" : ""}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                iv.status === "completed"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {iv.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
