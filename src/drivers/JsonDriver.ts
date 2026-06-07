/**
 * JsonDriver — Loads questions from /questions.json, caches in localStorage.
 * No WASM, no service worker issues. Works perfectly on iOS Safari PWA.
 */
import type { DatabaseDriver } from './DatabaseDriver';
import type { Question, SearchFilters, SearchResult } from '../types';
import * as favoritesService from '../services/favorites';
import { removeVietnameseAccents } from '../utils/text';

const CACHE_KEY = 'factorysearch_questions_json';
const CACHE_VERSION_KEY = 'factorysearch_json_version';
const CURRENT_VERSION = '1.0';

export class JsonDriver implements DatabaseDriver {
  readonly name = 'JSON (Offline)';
  onProgress?: (percent: number, message: string) => void;

  private questions: Question[] = [];
  private loaded = false;

  private emitProgress(percent: number, message: string) {
    this.onProgress?.(percent, message);
  }

  async init(): Promise<void> {
    if (this.loaded) return;

    this.emitProgress(5, 'Đang kiểm tra dữ liệu cục bộ...');

    // Try loading from localStorage cache first
    try {
      const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      const cachedData = localStorage.getItem(CACHE_KEY);

      if (cachedData && cachedVersion === CURRENT_VERSION) {
        this.emitProgress(50, 'Đang tải từ bộ nhớ cục bộ...');
        this.questions = JSON.parse(cachedData);
        this.loaded = true;
        this.emitProgress(100, `Đã tải ${this.questions.length} câu hỏi từ bộ nhớ cục bộ!`);
        return;
      }
    } catch {
      // Cache miss or corrupt, fall through to fetch
    }

    // Fetch from /questions.json
    this.emitProgress(20, 'Đang tải dữ liệu từ server...');
    try {
      const response = await fetch('/questions.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.emitProgress(60, 'Đang xử lý dữ liệu...');
      const data: Question[] = await response.json();

      this.emitProgress(80, 'Đang lưu vào bộ nhớ cục bộ...');
      this.questions = data;

      // Save to localStorage for offline use
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
      } catch {
        // localStorage might be full, still works in-memory
        console.warn('[JsonDriver] Could not cache to localStorage (quota exceeded?)');
      }

      this.loaded = true;
      this.emitProgress(100, `Đã tải ${this.questions.length} câu hỏi!`);
    } catch (err) {
      throw new Error(`Không thể tải questions.json: ${err instanceof Error ? err.message : 'Network error'}`);
    }
  }

  async searchQuestions(query: string, filters: SearchFilters, page: number, pageSize: number): Promise<SearchResult> {
    await this.init();

    const t0 = performance.now();
    const cleanQuery = removeVietnameseAccents(query).toLowerCase().trim();
    const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 0);

    const matched = this.questions.filter(q => {
      // Apply filters
      if (filters.school && q.school !== filters.school) return false;
      if (filters.subject && q.subject !== filters.subject) return false;
      if (filters.chapter && q.chapter !== filters.chapter) return false;
      if (filters.tag) {
        const tags = q.tags ? q.tags.split(',').map(t => t.trim()) : [];
        if (!tags.includes(filters.tag)) return false;
      }

      // Full text search
      if (queryWords.length > 0) {
        const searchText = removeVietnameseAccents(
          `${q.question} ${q.answer} ${q.subject} ${q.chapter} ${q.tags || ''} ${q.explanation || ''}`
        ).toLowerCase();
        return queryWords.every(word => searchText.includes(word));
      }

      return true;
    });

    const total = matched.length;
    const offset = (page - 1) * pageSize;
    const paged = matched.slice(offset, offset + pageSize);
    const t1 = performance.now();

    return { questions: paged, total, timeMs: t1 - t0 };
  }

  async getQuestionById(id: number): Promise<Question | null> {
    await this.init();
    return this.questions.find(q => q.id === id) || null;
  }

  getFavorites(): Promise<Question[]> {
    return favoritesService.getFavorites();
  }

  addFavorite(question: Question): Promise<void> {
    return favoritesService.addFavorite(question);
  }

  removeFavorite(id: number): Promise<void> {
    return favoritesService.removeFavorite(id);
  }

  isFavorite(id: number): Promise<boolean> {
    return favoritesService.isFavorite(id);
  }

  async getSchools(): Promise<string[]> {
    await this.init();
    const schools = new Set<string>();
    this.questions.forEach(q => { if (q.school) schools.add(q.school); });
    return Array.from(schools).sort();
  }

  async getSubjects(school?: string): Promise<string[]> {
    await this.init();
    const subjects = new Set<string>();
    this.questions.forEach(q => {
      if (!school || q.school === school) subjects.add(q.subject);
    });
    return Array.from(subjects).sort();
  }

  async getChapters(subject?: string, school?: string): Promise<string[]> {
    await this.init();
    const chapters = new Set<string>();
    this.questions.forEach(q => {
      if ((!school || q.school === school) && (!subject || q.subject === subject)) {
        chapters.add(q.chapter);
      }
    });
    return Array.from(chapters).sort();
  }

  async getTags(): Promise<string[]> {
    await this.init();
    const tags = new Set<string>();
    this.questions.forEach(q => {
      if (q.tags) q.tags.split(',').forEach(t => { const tr = t.trim(); if (tr) tags.add(tr); });
    });
    return Array.from(tags).sort();
  }

  async importQuestionsFromJson(incoming: Question[]): Promise<void> {
    this.emitProgress(20, 'Đang xử lý dữ liệu JSON...');
    // Assign IDs if missing
    const maxId = this.questions.reduce((m, q) => Math.max(m, q.id || 0), 0);
    const withIds = incoming.map((q, i) => ({
      ...q,
      id: q.id || maxId + i + 1,
      created_at: q.created_at || new Date().toISOString()
    }));

    // Merge (avoid duplicate IDs)
    const existingIds = new Set(this.questions.map(q => q.id));
    const newOnes = withIds.filter(q => !existingIds.has(q.id));
    this.questions = [...this.questions, ...newOnes];

    this.emitProgress(70, 'Đang lưu vào bộ nhớ cục bộ...');
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.questions));
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
    } catch {
      console.warn('[JsonDriver] localStorage quota exceeded');
    }
    this.emitProgress(100, `Đã nhập ${newOnes.length} câu hỏi mới!`);
  }

  exportDatabase(): Promise<ArrayBuffer> {
    const json = JSON.stringify(this.questions, null, 2);
    const encoder = new TextEncoder();
    return Promise.resolve(encoder.encode(json).buffer);
  }

  async clearDatabase(): Promise<void> {
    this.emitProgress(20, 'Đang xóa cache cũ...');
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
    this.questions = [];
    this.loaded = false;

    this.emitProgress(40, 'Đang tải lại dữ liệu từ server...');
    await this.init();
  }
}
