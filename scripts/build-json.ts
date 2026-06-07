/**
 * Build script: generates public/questions.json from hubtQuestions data + test questions
 * Run: vite-node scripts/build-json.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hubtQuestions } from '../src/data/hubtQuestions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testQuestions = [
  {
    id: 1,
    school: 'TEST',
    subject: 'Kiểm tra JSON',
    chapter: 'Test driver',
    question: 'JSON driver có hoạt động không?\nA. Có — tôi thấy câu hỏi này\nB. Không\nC. Không biết\nD. Không quan tâm',
    answer: 'A. Có — tôi thấy câu hỏi này',
    explanation: 'Nếu bạn thấy câu này, JSON driver đang chạy tốt!',
    tags: 'test,json',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    school: 'TEST',
    subject: 'Kiểm tra JSON',
    chapter: 'Test driver',
    question: 'SQLite WebAssembly có cần nữa không?\nA. Có\nB. Không — JSON đủ rồi\nC. Tùy\nD. Không biết',
    answer: 'B. Không — JSON đủ rồi',
    explanation: 'JSON đơn giản, nhẹ, không cần WASM, không có bug iOS.',
    tags: 'test,json',
    created_at: new Date().toISOString()
  }
];

const hubtWithIds = hubtQuestions.map((q, i) => ({
  id: i + 100,
  ...q,
  created_at: new Date().toISOString()
}));

const allQuestions = [...testQuestions, ...hubtWithIds];

const outputPath = path.resolve(__dirname, '../public/questions.json');
fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2), 'utf-8');

const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`✅ Đã tạo public/questions.json`);
console.log(`   Tổng: ${allQuestions.length} câu hỏi | Kích thước: ${sizeKB} KB`);
