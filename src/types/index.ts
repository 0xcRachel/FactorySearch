export interface Question {
  id: number;
  subject: string;
  chapter: string;
  question: string;
  question_clean?: string; // Unaccented text for FTS search
  answer: string;
  explanation: string | null;
  tags: string | null; // Comma-separated tags
  created_at?: string;
}

export interface SearchFilters {
  subject?: string;
  chapter?: string;
  tag?: string;
}

export interface SearchResult {
  questions: Question[];
  total: number;
  timeMs: number;
}

export type ThemeMode = 'light' | 'dark';

export interface UserSettings {
  theme: ThemeMode;
  activeDriver: 'sqlite' | 'indexeddb' | 'api' | 'mock';
  dbLastUpdated: string | null;
  dbSize: number | null;
  dbFileName: string | null;
  hasSeenOnboarding: boolean;
}
