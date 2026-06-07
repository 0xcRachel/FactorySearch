export interface Question {
  id: number;
  school?: string;       // Trường / tổ chức (optional, can be stored in subject prefix)
  subject: string;
  chapter: string;
  question: string;
  question_clean?: string;
  answer: string;
  explanation: string | null;
  tags: string | null;
  created_at?: string;
}

export interface SearchFilters {
  school?: string;   // Trường / tổ chức
  subject?: string;  // Môn học
  chapter?: string;  // Chương
  tag?: string;      // Tag
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
