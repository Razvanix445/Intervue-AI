export interface Emotion {
  label: string;
  score: number;
  emoji?: string;
}

export interface AnswerOut {
  id: string;
  question_id: string;
  text: string;
  sentiment_score: number | null;
  sentiment_label: "positive" | "neutral" | "negative" | null;
  emotions: Emotion[] | null;
  created_at: string;
}

export interface QuestionWithAnswer {
  id: string;
  number: number;
  text: string;
  answer: AnswerOut | null;
}

export interface SummaryOut {
  id: string;
  text: string;
  themes: string[] | null;
  keywords: { word: string; score: number }[] | null;
  overall_sentiment: number | null;
  sentiment_label: "positive" | "neutral" | "negative" | null;
  created_at: string;
}

export interface InterviewOut {
  id: string;
  topic: string;
  status: "active" | "completed";
  num_questions: number;
  created_at: string;
  updated_at: string;
  questions: QuestionWithAnswer[];
  summary: SummaryOut | null;
}

export interface InterviewListItem {
  id: string;
  topic: string;
  status: "active" | "completed";
  num_questions: number;
  overall_sentiment: number | null;
  sentiment_label: "positive" | "neutral" | "negative" | null;
  created_at: string;
}
