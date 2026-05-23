"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const toggle = () => setIsOpen((v) => !v);

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isOpen} onToggle={toggle} />

      <div className="flex-1 min-w-0 relative flex flex-col">
        {/* Floating open-sidebar button — only visible when sidebar is collapsed */}
        {!isOpen && (
          <button
            onClick={toggle}
            title="Open sidebar"
            className="fixed top-3 left-3 z-50 w-8 h-8 rounded-lg bg-warm-200 border border-warm-300
                       flex items-center justify-center text-warm-600 hover:bg-warm-300 hover:text-warm-900
                       transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
