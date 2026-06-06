import type { DatabaseDriver } from './DatabaseDriver';
import type { Question, SearchFilters, SearchResult } from '../types';
import * as favoritesService from '../services/favorites';
import { removeVietnameseAccents } from '../utils/text';

export class IndexedDBDriver implements DatabaseDriver {
  readonly name = 'IndexedDB (Object Store)';
  private db: IDBDatabase | null = null;
  private DB_NAME = 'IndexedDBQuestions';
  private STORE_NAME = 'questions';

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('subject', 'subject', { unique: false });
          store.createIndex('chapter', 'chapter', { unique: false });
        }
      };
    });
  }

  private getStore(mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(this.STORE_NAME, mode);
    return transaction.objectStore(this.STORE_NAME);
  }

  async searchQuestions(query: string, filters: SearchFilters, page: number, pageSize: number): Promise<SearchResult> {
    await this.init();
    const store = this.getStore('readonly');
    const cleanQuery = removeVietnameseAccents(query).trim();
    const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 0);

    return new Promise((resolve, reject) => {
      const results: Question[] = [];
      const request = store.openCursor(null, 'prev'); // Newest first (reverse ID)
      const offset = (page - 1) * pageSize;
      let count = 0;
      let matchedCount = 0;

      const t0 = performance.now();

      request.onsuccess = (e) => {
        const cursor = request.result;
        if (cursor) {
          const question: Question = cursor.value;
          let isMatch = true;

          // Apply filters
          if (filters.subject && question.subject !== filters.subject) {
            isMatch = false;
          }
          if (filters.chapter && question.chapter !== filters.chapter) {
            isMatch = false;
          }
          if (filters.tag) {
            const tagsList = question.tags ? question.tags.split(',').map(t => t.trim()) : [];
            if (!tagsList.includes(filters.tag)) {
              isMatch = false;
            }
          }

          // Apply full text search
          if (isMatch && queryWords.length > 0) {
            const cleanText = removeVietnameseAccents(
              `${question.question} ${question.subject} ${question.chapter} ${question.tags || ''}`
            );
            for (const word of queryWords) {
              if (!cleanText.includes(word)) {
                isMatch = false;
                break;
              }
            }
          }

          if (isMatch) {
            matchedCount++;
            // Pagination logic
            if (matchedCount > offset && results.length < pageSize) {
              results.push(question);
            }
          }

          count++;
          // Performance optimization: Stop cursor if we have enough and just need approximate total
          // For simplicity, we scan all for exact total count. For very large datasets (>50,000), 
          // this can take a moment, but is reliable.
          cursor.continue();
        } else {
          const t1 = performance.now();
          resolve({
            questions: results,
            total: matchedCount,
            timeMs: t1 - t0
          });
        }
      };

      request.onerror = () => reject(new Error('Search failed'));
    });
  }

  async getQuestionById(id: number): Promise<Question | null> {
    await this.init();
    const store = this.getStore('readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to fetch question by ID'));
    });
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

  async getSubjects(): Promise<string[]> {
    await this.init();
    const store = this.getStore('readonly');
    return new Promise((resolve, reject) => {
      const subjects = new Set<string>();
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          subjects.add(cursor.value.subject);
          cursor.continue();
        } else {
          resolve(Array.from(subjects).sort());
        }
      };
      request.onerror = () => reject(new Error('Failed to retrieve subjects'));
    });
  }

  async getChapters(subject?: string): Promise<string[]> {
    await this.init();
    const store = this.getStore('readonly');
    return new Promise((resolve, reject) => {
      const chapters = new Set<string>();
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const q = cursor.value;
          if (!subject || q.subject === subject) {
            chapters.add(q.chapter);
          }
          cursor.continue();
        } else {
          resolve(Array.from(chapters).sort());
        }
      };
      request.onerror = () => reject(new Error('Failed to retrieve chapters'));
    });
  }

  async getTags(): Promise<string[]> {
    await this.init();
    const store = this.getStore('readonly');
    return new Promise((resolve, reject) => {
      const tags = new Set<string>();
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const q = cursor.value;
          if (q.tags) {
            q.tags.split(',').forEach((t: string) => {
              const trimmed = t.trim();
              if (trimmed) tags.add(trimmed);
            });
          }
          cursor.continue();
        } else {
          resolve(Array.from(tags).sort());
        }
      };
      request.onerror = () => reject(new Error('Failed to retrieve tags'));
    });
  }

  async importQuestionsFromJson(questions: Question[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Import transaction failed'));

      for (const q of questions) {
        store.put({
          subject: q.subject,
          chapter: q.chapter,
          question: q.question,
          answer: q.answer,
          explanation: q.explanation || null,
          tags: q.tags || null,
          created_at: q.created_at || new Date().toISOString()
        });
      }
    });
  }

  async clearDatabase(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear database'));
    });
  }
}
