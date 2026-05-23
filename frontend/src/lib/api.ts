import type { AnswerOut, InterviewListItem, InterviewOut } from "./types";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createInterview: (topic: string, num_questions: number, temperature = 0.7, persona = "neutral") =>
    req<InterviewOut>("/interviews", {
      method: "POST",
      body: JSON.stringify({ topic, num_questions, temperature, persona }),
    }),

  getInterview: (id: string) => req<InterviewOut>(`/interviews/${id}`),

  listInterviews: () => req<InterviewListItem[]>("/interviews"),

  submitAnswer: (interviewId: string, question_id: string, text: string) =>
    req<AnswerOut>(`/interviews/${interviewId}/answers`, {
      method: "POST",
      body: JSON.stringify({ question_id, text }),
    }),

  streamQuestion: (interviewId: string) =>
    new EventSource(`/api/interviews/${interviewId}/stream-question`),

  streamSummary: (interviewId: string) =>
    new EventSource(`/api/interviews/${interviewId}/stream-summary`),

  exportInterview: (interviewId: string) =>
    window.open(`/api/interviews/${interviewId}/export`, "_blank"),
};
