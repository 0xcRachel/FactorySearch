import type { Question, SearchFilters, SearchResult } from '../types';

export interface DatabaseDriver {
  name: string;
  init(): Promise<void>;
  searchQuestions(query: string, filters: SearchFilters, page: number, pageSize: number): Promise<SearchResult>;
  getQuestionById(id: number): Promise<Question | null>;
  getFavorites(): Promise<Question[]>;
  addFavorite(question: Question): Promise<void>;
  removeFavorite(id: number): Promise<void>;
  isFavorite(id: number): Promise<boolean>;
  getSubjects(): Promise<string[]>;
  getChapters(subject?: string): Promise<string[]>;
  getTags(): Promise<string[]>;
  importDatabase?(file: ArrayBuffer): Promise<void>;
  exportDatabase?(): Promise<ArrayBuffer>;
  importQuestionsFromJson?(questions: Question[]): Promise<void>;
  clearDatabase?(): Promise<void>;
}
