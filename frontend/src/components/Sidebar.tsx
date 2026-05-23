"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import type { InterviewListItem } from "@/lib/types";

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);

  useEffect(() => {
    api.listInterviews().then(setInterviews).catch(() => {});
  }, [pathname]);

  return (
    <aside
      className="flex-shrink-0 h-screen bg-warm-200 border-r border-warm-300 overflow-hidden flex"
      style={{
        width: isOpen ? "256px" : "0px",
        borderRightWidth: isOpen ? 1 : 0,
        transition: "width 0.26s cubic-bezier(0.4, 0, 0.2, 1), border-right-width 0.26s ease",
      }}
    >
      {/* Inner wrapper — fixed width so content doesn't squish during animation */}
      <div className="w-64 flex-shrink-0 flex flex-col h-full">

        {/* Header: logo + app name + close button */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Intervue AI"
              className="w-7 h-7 flex-shrink-0"
            />
            <span className="text-sm font-semibold text-warm-900 tracking-tight truncate">
              Intervue AI
            </span>
          </div>

          {/* Close sidebar button */}
          <button
            onClick={onToggle}
            title="Close sidebar"
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                       text-warm-500 hover:bg-warm-300 hover:text-warm-800 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <polyline points="15 9 12 12 15 15"/>
            </svg>
          </button>
        </div>

        {/* New interview button */}
        <div className="px-3 pb-3">
          <button
            onClick={() => router.push("/")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === "/"
                ? "bg-warm-300 text-warm-950 font-medium"
                : "text-warm-700 hover:bg-warm-300/70 hover:text-warm-950"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New interview
          </button>
        </div>

        <div className="mx-3 border-t border-warm-300" />

        {/* Interview list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 px-2 space-y-0.5">
          {interviews.length === 0 && (
            <p className="text-xs text-warm-500 px-3 py-3">No interviews yet.</p>
          )}
          {interviews.map((iv) => {
            const isActive = pathname === `/interview/${iv.id}`;
            return (
              <button
                key={iv.id}
                onClick={() => router.push(`/interview/${iv.id}`)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-warm-300 text-warm-950"
                    : "text-warm-800 hover:bg-warm-300/60 hover:text-warm-950"
                }`}
              >
                <p className="text-sm truncate leading-snug font-medium">{iv.topic}</p>
                <p className="text-xs text-warm-500 mt-0.5 flex items-center gap-1.5">
                  <span>{relativeDate(iv.created_at)}</span>
                  <span>·</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${
                      iv.status === "completed" ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  />
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
