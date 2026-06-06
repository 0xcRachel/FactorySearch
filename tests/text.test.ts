import { describe, it, expect } from 'vitest';
import { removeVietnameseAccents, highlightKeywords } from '../src/utils/text';

describe('removeVietnameseAccents', () => {
  it('removes Vietnamese tonal marks correctly', () => {
    expect(removeVietnameseAccents('đáp án')).toBe('dap an');
    expect(removeVietnameseAccents('câu hỏi')).toBe('cau hoi');
    expect(removeVietnameseAccents('Tiếng Việt')).toBe('tieng viet');
  });

  it('handles đ/Đ correctly', () => {
    expect(removeVietnameseAccents('Đại học')).toBe('dai hoc');
    expect(removeVietnameseAccents('đại học')).toBe('dai hoc');
  });

  it('lowercases output', () => {
    expect(removeVietnameseAccents('ABC XYZ')).toBe('abc xyz');
  });

  it('handles empty string', () => {
    expect(removeVietnameseAccents('')).toBe('');
  });

  it('handles plain ASCII unchanged', () => {
    expect(removeVietnameseAccents('hello world')).toBe('hello world');
  });

  it('trims whitespace', () => {
    expect(removeVietnameseAccents('  hello  ')).toBe('hello');
  });
});

describe('highlightKeywords', () => {
  it('returns empty array for empty text', () => {
    expect(highlightKeywords('', 'test')).toEqual([]);
  });

  it('returns single non-match segment when no query', () => {
    const result = highlightKeywords('hello world', '');
    expect(result).toEqual([{ text: 'hello world', isMatch: false }]);
  });

  it('marks matching segments', () => {
    const result = highlightKeywords('tìm kiếm câu hỏi', 'cau hoi');
    const matchingSegment = result.find(s => s.isMatch);
    expect(matchingSegment).toBeTruthy();
  });

  it('handles no matches gracefully', () => {
    const result = highlightKeywords('hello world', 'xxxxxxx');
    expect(result).toEqual([{ text: 'hello world', isMatch: false }]);
  });

  it('handles unaccented query matching accented text', () => {
    const result = highlightKeywords('câu hỏi toán học', 'cau hoi');
    const matched = result.some(s => s.isMatch);
    expect(matched).toBe(true);
  });
});
