import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockDriver } from '../src/drivers/MockDriver';
import { DriverFactory } from '../src/drivers/DriverFactory';

describe('MockDriver', () => {
  let driver: MockDriver;

  beforeEach(() => {
    driver = new MockDriver();
  });

  it('initializes without error', async () => {
    await expect(driver.init()).resolves.toBeUndefined();
  });

  it('has correct name', () => {
    expect(driver.name).toBe('Mock Data (Offline Test)');
  });

  it('returns questions on empty query', async () => {
    const result = await driver.searchQuestions('', {}, 1, 10);
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.timeMs).toBeGreaterThan(0);
  });

  it('returns correct structure per question', async () => {
    const result = await driver.searchQuestions('', {}, 1, 1);
    const q = result.questions[0];
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('subject');
    expect(q).toHaveProperty('chapter');
    expect(q).toHaveProperty('question');
    expect(q).toHaveProperty('answer');
  });

  it('filters by subject', async () => {
    const result = await driver.searchQuestions('', { subject: 'Toán Giải Tích' }, 1, 20);
    for (const q of result.questions) {
      expect(q.subject).toBe('Toán Giải Tích');
    }
  });

  it('searches by Vietnamese keyword', async () => {
    const result = await driver.searchQuestions('đạo hàm', {}, 1, 10);
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it('searches by unaccented keyword', async () => {
    const result = await driver.searchQuestions('dao ham', {}, 1, 10);
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it('returns question by ID', async () => {
    const q = await driver.getQuestionById(1);
    expect(q).not.toBeNull();
    expect(q?.id).toBe(1);
  });

  it('returns null for non-existent ID', async () => {
    const q = await driver.getQuestionById(99999);
    expect(q).toBeNull();
  });

  it('returns subjects list', async () => {
    const subjects = await driver.getSubjects();
    expect(Array.isArray(subjects)).toBe(true);
    expect(subjects.length).toBeGreaterThan(0);
  });

  it('returns chapters list', async () => {
    const chapters = await driver.getChapters();
    expect(Array.isArray(chapters)).toBe(true);
    expect(chapters.length).toBeGreaterThan(0);
  });

  it('filters chapters by subject', async () => {
    const chapters = await driver.getChapters('Toán Giải Tích');
    expect(Array.isArray(chapters)).toBe(true);
    expect(chapters.length).toBeGreaterThan(0);
  });

  it('returns tags list', async () => {
    const tags = await driver.getTags();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
  });

  it('handles pagination', async () => {
    const page1 = await driver.searchQuestions('', {}, 1, 2);
    const page2 = await driver.searchQuestions('', {}, 2, 2);
    // page2 should be different results (or empty if no more results)
    expect(page1.questions.map(q => q.id)).not.toEqual(
      page2.questions.map(q => q.id)
    );
  });
});

describe('DriverFactory', () => {
  it('returns MockDriver for type "mock"', () => {
    const driver = DriverFactory.getDriver('mock');
    expect(driver.name).toBe('Mock Data (Offline Test)');
  });

  it('returns same instance on repeated calls (singleton)', () => {
    const d1 = DriverFactory.getDriver('mock');
    const d2 = DriverFactory.getDriver('mock');
    expect(d1).toBe(d2);
  });

  it('throws on unknown driver type', () => {
    expect(() => DriverFactory.getDriver('unknown' as any)).toThrow();
  });
});
