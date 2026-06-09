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

    this.emitProgress(10, 'Đang tải dữ liệu từ các file JSON...');
    try {
      // Automatically load all JSON files from QuestionJSON directory
      const jsonModules = import.meta.glob('../../QuestionJSON/*.json', { eager: true });
      let allQuestions: Question[] = [];
      let idCounter = 1;

      this.emitProgress(50, 'Đang xử lý dữ liệu...');
      
      for (const path in jsonModules) {
        const module = jsonModules[path] as any;
        const content = module.default || module;
        
        const subjectName = path.split('/').pop()?.replace('.json', '') || 'General';

        let items: any[] = [];
        if (Array.isArray(content)) {
          items = content;
        } else {
          // Flatten object properties (e.g. { "Tin_2": [ ... ] })
          for (const key in content) {
            if (Array.isArray(content[key])) {
              const mapped = content[key].map((q: any) => ({
                ...q,
                _categoryKey: key // Save the key to use as chapter/category
              }));
              items = items.concat(mapped);
            }
          }
        }

        // Normalize and add to list
        for (const q of items) {
          allQuestions.push({
            id: q.id || idCounter++,
            school: q.school || 'Đại học',
            subject: q.subject || subjectName,
            chapter: q.chapter || q._categoryKey || 'Tổng hợp',
            question: q.question || '',
            answer: q.answer || '',
            explanation: q.explanation || '',
            tags: q.tags || subjectName,
            created_at: q.created_at || new Date().toISOString()
          });
        }
      }

      this.emitProgress(80, 'Đang lưu vào bộ nhớ...');
      this.questions = allQuestions;
      this.loaded = true;
      this.emitProgress(100, `Đã tải ${this.questions.length} câu hỏi!`);
    } catch (err) {
      throw new Error(`Không thể tải dữ liệu JSON: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
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
