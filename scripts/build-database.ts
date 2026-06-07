import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { removeVietnameseAccents } from '../src/utils/text.js';
import { parseCSV, RawQuestion } from './import-csv.js';
import { parseExcel } from './import-excel.js';
import { parseDocx } from './import-docx.js';
import { parsePdf } from './import-pdf.js';
import { hubtQuestions } from '../src/data/hubtQuestions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate 1,000+ unique question seeds if no external files
function generateSeedQuestions(): RawQuestion[] {
  const seeds: RawQuestion[] = [];
  
  // 6. HUBT Tin học 2 (75 questions)
  for (const q of hubtQuestions) {
    seeds.push(q as RawQuestion);
  }

  return seeds;
}

async function build() {
  console.log('=== KHỞI CHẠY BUILD DATABASE SQLITE ===');
  
  // 1. Load sql-wasm.wasm
  const wasmPath = path.resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
  if (!fs.existsSync(wasmPath)) {
    console.error(`Lỗi: Không tìm thấy WASM tại ${wasmPath}. Vui lòng chạy npm install trước.`);
    process.exit(1);
  }
  const wasmBinary = fs.readFileSync(wasmPath);
  
  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database();
  
  // 2. Tạo Schema
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school TEXT,
      subject TEXT NOT NULL,
      chapter TEXT NOT NULL,
      question TEXT NOT NULL,
      question_clean TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  let hasFts = true;
  try {
    db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
        id UNINDEXED,
        school,
        subject,
        chapter,
        question,
        question_clean,
        tags,
        tokenize='unicode61'
      );
    `);
  } catch (e) {
    hasFts = false;
    console.warn('FTS5 not supported in this Node environment, virtual table questions_fts will be created on client initialization.');
  }

  if (hasFts) {
    try {
      db.run(`
        CREATE TRIGGER IF NOT EXISTS questions_after_insert AFTER INSERT ON questions BEGIN
          INSERT INTO questions_fts(id, school, subject, chapter, question, question_clean, tags)
          VALUES (new.id, new.school, new.subject, new.chapter, new.question, new.question_clean, new.tags);
        END;
      `);
    } catch (e) {
      console.warn('Triggers not created in build tool, will be created on client initialization.');
    }
  }

  console.log('Đã khởi tạo schema thành công.');

  const questionsList: RawQuestion[] = [];

  // 3. Scan & Import từ thư mục imports/
  const importsDir = path.resolve(__dirname, '../imports');
  if (fs.existsSync(importsDir)) {
    const files = fs.readdirSync(importsDir);
    console.log(`Tìm thấy thư mục imports/ chứa ${files.length} tệp.`);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const filePath = path.join(importsDir, file);
      
      console.log(`Đang phân tích: ${file}...`);
      try {
        let imported: RawQuestion[] = [];
        if (ext === '.csv') {
          imported = parseCSV(filePath);
        } else if (ext === '.xlsx' || ext === '.xls') {
          imported = parseExcel(filePath);
        } else if (ext === '.docx') {
          imported = await parseDocx(filePath);
        } else if (ext === '.pdf') {
          imported = await parsePdf(filePath);
        }
        
        console.log(`-> Nhập thành công ${imported.length} câu hỏi từ ${file}`);
        questionsList.push(...imported);
      } catch (err) {
        console.error(`-> Lỗi khi xử lý tệp ${file}:`, err);
      }
    }
  }

  if (questionsList.length === 0) {
    console.log('Không tìm thấy tệp dữ liệu ngoài hoặc rỗng. Nạp dữ liệu mặc định...');
    questionsList.push(...generateSeedQuestions());
  } else {
    console.log(`Đang gieo thêm câu hỏi mẫu để bổ sung vào ${questionsList.length} câu hỏi ngoài...`);
    questionsList.push(...generateSeedQuestions());
  }

  // 5. Ghi dữ liệu vào database bằng TRANSACTION để tối ưu tốc độ
  db.run('BEGIN TRANSACTION;');
  const stmt = db.prepare(`
    INSERT INTO questions (school, subject, chapter, question, question_clean, answer, explanation, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of questionsList) {
    const cleanQuestion = removeVietnameseAccents(q.question);
    stmt.run([
      q.school || null,
      q.subject,
      q.chapter,
      q.question,
      cleanQuestion,
      q.answer,
      q.explanation || null,
      q.tags || null
    ]);
  }
  stmt.free();
  db.run('COMMIT;');

  console.log(`Tổng số câu hỏi được nạp vào SQLite: ${questionsList.length} câu hỏi.`);

  // 6. Xuất Database ra tệp public/questions.db
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const dbDest = path.join(publicDir, 'questions.db');
  const binaryDb = db.export();
  fs.writeFileSync(dbDest, Buffer.from(binaryDb));
  
  console.log(`===> Đã xuất thành công questions.db tại: ${dbDest}`);
  console.log(`Kích thước tệp tin: ${(binaryDb.byteLength / 1024 / 1024).toFixed(2)} MB`);
  
  db.close();
}

build().catch(err => {
  console.error('Lỗi nghiêm trọng trong quá trình build db:', err);
  process.exit(1);
});
