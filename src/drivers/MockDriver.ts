import type { DatabaseDriver } from './DatabaseDriver';
import type { Question, SearchFilters, SearchResult } from '../types';
import * as favoritesService from '../services/favorites';
import { removeVietnameseAccents } from '../utils/text';

const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    school: 'Đại học Bách Khoa',
    subject: 'Toán Giải Tích',
    chapter: 'Chương 1: Đạo hàm và tích phân',
    question: 'Tính đạo hàm của hàm số y = ln(x^2 + 1).',
    answer: 'y\' = 2x / (x^2 + 1)',
    explanation: 'Sử dụng công thức đạo hàm hàm hợp: (ln(u))\' = u\' / u. Ở đây u = x^2 + 1, nên u\' = 2x. Vậy y\' = 2x / (x^2 + 1).',
    tags: 'đạo hàm,giải tích,ln',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    school: 'Đại học Bách Khoa',
    subject: 'Toán Giải Tích',
    chapter: 'Chương 1: Đạo hàm và tích phân',
    question: 'Tính tích phân cận từ 0 đến 1 của hàm số f(x) = x^2.',
    answer: '1/3',
    explanation: 'Nguyên hàm của x^2 là x^3/3. Thế cận từ 0 đến 1: F(1) - F(0) = 1/3 - 0 = 1/3.',
    tags: 'tích phân,giải tích,cơ bản',
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    school: 'Đại học Bách Khoa',
    subject: 'Cấu trúc dữ liệu và giải thuật',
    chapter: 'Chương 2: Danh sách và cây nhị phân',
    question: 'Độ phức tạp thời gian trung bình của thuật toán sắp xếp nhanh (Quick Sort) là gì?',
    answer: 'O(n log n)',
    explanation: 'Quick Sort chia mảng thành các mảng con bằng phần tử chốt (pivot). Ở trường hợp trung bình, độ phức tạp là O(n log n). Trường hợp xấu nhất là O(n^2).',
    tags: 'quicksort,sắp xếp,độ phức tạp',
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    school: 'Đại học Kinh Tế',
    subject: 'Cấu trúc dữ liệu và giải thuật',
    chapter: 'Chương 2: Danh sách và cây nhị phân',
    question: 'Trong cây nhị phân tìm kiếm (BST), duyệt theo thứ tự nào sẽ cho ra danh sách khóa tăng dần?',
    answer: 'Duyệt trung thứ tự (In-order traversal)',
    explanation: 'Duyệt trung tự (In-order): Duyệt con trái -> Gốc -> Duyệt con phải. Trong BST, thứ tự này luôn trả về các giá trị theo thứ tự tăng dần.',
    tags: 'bst,cây nhị phân,duyệt cây',
    created_at: new Date().toISOString()
  },
  {
    id: 5,
    school: 'Đại học Kinh Tế',
    subject: 'Vật lý đại cương',
    chapter: 'Chương 1: Cơ học chất điểm',
    question: 'Phát biểu định luật II Newton dưới dạng phương trình.',
    answer: 'F = m.a',
    explanation: 'Véc tơ lực tác dụng lên vật tỉ lệ thuận với gia tốc của vật. Hệ số tỉ lệ là khối lượng m: F = m.a.',
    tags: 'newton,lực,cơ học',
    created_at: new Date().toISOString()
  },
  {
    id: 6,
    school: 'Đại học Kinh Tế',
    subject: 'Vật lý đại cương',
    chapter: 'Chương 2: Nhiệt động lực học',
    question: 'Phát biểu nguyên lý thứ nhất của nhiệt động lực học.',
    answer: 'Q = dU + A',
    explanation: 'Nhiệt lượng truyền cho hệ bằng biến thiên nội năng của hệ cộng với công mà hệ sinh ra: Q = dU + A.',
    tags: 'nhiệt học,nội năng,nguyên lý 1',
    created_at: new Date().toISOString()
  }
];

export class MockDriver implements DatabaseDriver {
  readonly name = 'Mock Data (Offline Test)';

  async init(): Promise<void> {}

  async searchQuestions(query: string, filters: SearchFilters, page: number, pageSize: number): Promise<SearchResult> {
    const cleanQuery = removeVietnameseAccents(query).trim();
    const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 0);

    const filtered = MOCK_QUESTIONS.filter(q => {
      if (filters.school && q.school !== filters.school) return false;
      if (filters.subject && q.subject !== filters.subject) return false;
      if (filters.chapter && q.chapter !== filters.chapter) return false;
      if (filters.tag) {
        const qTags = q.tags ? q.tags.split(',').map(t => t.trim()) : [];
        if (!qTags.includes(filters.tag)) return false;
      }
      if (queryWords.length > 0) {
        const targetText = removeVietnameseAccents(`${q.question} ${q.subject} ${q.chapter} ${q.tags || ''}`);
        return queryWords.every(word => targetText.includes(word));
      }
      return true;
    });

    const offset = (page - 1) * pageSize;
    const questions = filtered.slice(offset, offset + pageSize);
    return { questions, total: filtered.length, timeMs: 1.5 };
  }

  async getQuestionById(id: number): Promise<Question | null> {
    return MOCK_QUESTIONS.find(q => q.id === id) || null;
  }

  getFavorites() { return favoritesService.getFavorites(); }
  addFavorite(question: Question) { return favoritesService.addFavorite(question); }
  removeFavorite(id: number) { return favoritesService.removeFavorite(id); }
  isFavorite(id: number) { return favoritesService.isFavorite(id); }

  async getSchools(): Promise<string[]> {
    return Array.from(new Set(MOCK_QUESTIONS.map(q => q.school).filter((s): s is string => !!s))).sort();
  }

  async getSubjects(school?: string): Promise<string[]> {
    const list = school ? MOCK_QUESTIONS.filter(q => q.school === school) : MOCK_QUESTIONS;
    return Array.from(new Set(list.map(q => q.subject))).sort();
  }

  async getChapters(subject?: string, school?: string): Promise<string[]> {
    let list = MOCK_QUESTIONS;
    if (school) list = list.filter(q => q.school === school);
    if (subject) list = list.filter(q => q.subject === subject);
    return Array.from(new Set(list.map(q => q.chapter))).sort();
  }

  async getTags(): Promise<string[]> {
    const tagsSet = new Set<string>();
    MOCK_QUESTIONS.forEach(q => {
      if (q.tags) q.tags.split(',').forEach(t => tagsSet.add(t.trim()));
    });
    return Array.from(tagsSet).sort();
  }
}
