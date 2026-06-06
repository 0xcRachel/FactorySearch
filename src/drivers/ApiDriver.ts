import type { DatabaseDriver } from './DatabaseDriver';
import type { Question, SearchFilters, SearchResult } from '../types';
import * as favoritesService from '../services/favorites';
import { MockDriver } from './MockDriver';

// API Driver delegates to MockDriver internally but wraps it with a simulated network latency (e.g. 150ms delay)
export class ApiDriver implements DatabaseDriver {
  readonly name = 'REST API (Simulated Online)';
  private mockDelegate = new MockDriver();

  async init(): Promise<void> {
    await this.mockDelegate.init();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchQuestions(query: string, filters: SearchFilters, page: number, pageSize: number): Promise<SearchResult> {
    const t0 = performance.now();
    await this.delay(200); // 200ms latency simulation
    const result = await this.mockDelegate.searchQuestions(query, filters, page, pageSize);
    const t1 = performance.now();
    
    return {
      ...result,
      timeMs: result.timeMs + (t1 - t0)
    };
  }

  async getQuestionById(id: number): Promise<Question | null> {
    await this.delay(100);
    return this.mockDelegate.getQuestionById(id);
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
    await this.delay(80);
    return this.mockDelegate.getSubjects();
  }

  async getChapters(subject?: string): Promise<string[]> {
    await this.delay(80);
    return this.mockDelegate.getChapters(subject);
  }

  async getTags(): Promise<string[]> {
    await this.delay(80);
    return this.mockDelegate.getTags();
  }
}
