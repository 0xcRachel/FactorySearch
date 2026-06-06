import type { DatabaseDriver } from './DatabaseDriver';
import type { Question, SearchFilters, SearchResult } from '../types';
import * as favoritesService from '../services/favorites';
import DbWorker from '../workers/db.worker?worker';

export class SQLiteDriver implements DatabaseDriver {
  readonly name = 'SQLite (WASM)';
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: Error) => void }>();
  private subjectsCache: string[] = [];
  private tagsCache: string[] = [];
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Check if running in a browser environment before creating Worker
    if (typeof window !== 'undefined') {
      this.worker = new DbWorker();
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
    }
  }

  private handleWorkerMessage(e: MessageEvent) {
    const { id, success, payload, error } = e.data;
    const request = this.pendingRequests.get(id);
    if (request) {
      this.pendingRequests.delete(id);
      if (success) {
        request.resolve(payload);
      } else {
        request.reject(new Error(error || 'Worker error'));
      }
    }
  }

  private sendToWorker<T>(type: string, payload?: any): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error('Worker is not available (non-browser environment)'));
    }

    return new Promise<T>((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 9);
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({ type, payload, id });
    });
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = (async () => {
      await this.sendToWorker<void>('init');
      // Load initial filters
      await this.loadFiltersCache();
    })();
    
    return this.initPromise;
  }

  private async loadFiltersCache(): Promise<void> {
    try {
      const data = await this.sendToWorker<{ subjects: string[]; tags: string[] }>('getFiltersData');
      this.subjectsCache = data.subjects;
      this.tagsCache = data.tags;
    } catch (err) {
      console.error('Failed to load filter metadata from SQLite:', err);
    }
  }

  async searchQuestions(query: string, filters: SearchFilters, page: number, pageSize: number): Promise<SearchResult> {
    await this.init();
    return this.sendToWorker<SearchResult>('search', { query, filters, page, pageSize });
  }

  async getQuestionById(id: number): Promise<Question | null> {
    await this.init();
    return this.sendToWorker<Question | null>('getById', { id });
  }

  // Favorites logic proxied to shared IndexedDB service
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
    return this.subjectsCache;
  }

  async getChapters(subject?: string): Promise<string[]> {
    await this.init();
    return this.sendToWorker<string[]>('getChapters', { subject });
  }

  async getTags(): Promise<string[]> {
    await this.init();
    return this.tagsCache;
  }

  async importDatabase(file: ArrayBuffer): Promise<void> {
    await this.init();
    await this.sendToWorker<void>('importDatabase', { file });
    await this.loadFiltersCache(); // Reload filters metadata
  }

  async exportDatabase(): Promise<ArrayBuffer> {
    await this.init();
    return this.sendToWorker<ArrayBuffer>('exportDatabase');
  }

  async importQuestionsFromJson(questions: Question[]): Promise<void> {
    await this.init();
    await this.sendToWorker<void>('importJson', { questions });
    await this.loadFiltersCache(); // Reload filters metadata
  }

  async clearDatabase(): Promise<void> {
    await this.init();
    await this.sendToWorker<void>('clearDatabase');
    this.subjectsCache = [];
    this.tagsCache = [];
  }
}
