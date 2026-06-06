import initSqlJs, { type Database } from 'sql.js';
import localforage from 'localforage';
import { removeVietnameseAccents } from '../utils/text';
import type { Question } from '../types';

// Configure localforage
localforage.config({
  name: 'FactorySearch',
  storeName: 'database_store'
});

let db: Database | null = null;
let SQL: any = null;

const DB_CACHE_KEY = 'cached_sqlite_db';

/**
 * Initialize SQLite database.
 * Attempts to load from IndexedDB cache. If empty, creates and seeds the database.
 */
async function initDatabase(): Promise<{ size: number; source: 'indexeddb' | 'new' }> {
  if (db) {
    const cachedDbArray: ArrayBuffer | null = await localforage.getItem(DB_CACHE_KEY);
    return { size: cachedDbArray ? cachedDbArray.byteLength : 0, source: 'indexeddb' };
  }

  // Load sql.js WASM
  SQL = await initSqlJs({
    locateFile: (file) => `/${file}`
  });

  // Attempt to load database from IndexedDB cache
  const cachedDbArray: ArrayBuffer | null = await localforage.getItem(DB_CACHE_KEY);
  
  if (cachedDbArray) {
    db = new SQL.Database(new Uint8Array(cachedDbArray));
    return { size: cachedDbArray.byteLength, source: 'indexeddb' };
  } else {
    // Create new database and build schema
    db = new SQL.Database();
    createSchema();
    
    // Seed with 1000+ realistic questions
    console.log('Database cache empty. Seeding 1,000+ offline questions...');
    seedDatabase();
    
    const size = await saveDatabaseToCache();
    return { size, source: 'new' };
  }
}

/**
 * Creates standard database schema and virtual FTS5 tables
 */
function createSchema() {
  if (!db) return;
  
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      chapter TEXT NOT NULL,
      question TEXT NOT NULL,
      question_clean TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
      id UNINDEXED,
      subject,
      chapter,
      question,
      question_clean,
      tags,
      tokenize='unicode61'
    );
  `);

  // Triggers for syncing standard tables and virtual FTS5 tables
  db.run(`
    CREATE TRIGGER IF NOT EXISTS questions_after_insert AFTER INSERT ON questions BEGIN
      INSERT INTO questions_fts(id, subject, chapter, question, question_clean, tags)
      VALUES (new.id, new.subject, new.chapter, new.question, new.question_clean, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS questions_after_delete AFTER DELETE ON questions BEGIN
      DELETE FROM questions_fts WHERE id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS questions_after_update AFTER UPDATE ON questions BEGIN
      DELETE FROM questions_fts WHERE id = old.id;
      INSERT INTO questions_fts(id, subject, chapter, question, question_clean, tags)
      VALUES (new.id, new.subject, new.chapter, new.question, new.question_clean, new.tags);
    END;
  `);
}

/**
 * Seeds the database with 1000+ mock questions across subjects
 */
function seedDatabase() {
  if (!db) return;
  
  const seeds: any[] = [];
  
  // 1. Math Questions (250 questions)
  const mathChapters = [
    'Chương 1: Đạo hàm và ứng dụng',
    'Chương 2: Tích phân và hình học',
    'Chương 3: Phương trình vi phân',
    'Chương 4: Chuỗi số và chuỗi hàm'
  ];
  for (let i = 1; i <= 250; i++) {
    const a = i * 2 + 1;
    const b = i + 3;
    const chap = mathChapters[i % mathChapters.length];
    seeds.push({
      subject: 'Toán Giải Tích',
      chapter: chap,
      question: `Câu hỏi Toán ${i}: Cho hàm số y = ${a}x^2 + ${b}x + ${i}. Hãy tính đạo hàm bậc nhất y' của hàm số này tại điểm x = 1.`,
      answer: `y'(1) = ${a * 2 + b}`,
      explanation: `Ta có y' = ${a * 2}x + ${b}. Thế x = 1 vào đạo hàm: y'(1) = ${a * 2}*1 + ${b} = ${a * 2 + b}.`,
      tags: `toan,dao ham,giai tich,cau-${i}`
    });
  }

  // 2. Data Structures & Algorithms (250 questions)
  const dsaChapters = [
    'Chương 1: Cấu trúc tuần tự và ngăn xếp',
    'Chương 2: Cây nhị phân và cây cân bằng',
    'Chương 3: Thuật toán sắp xếp và tìm kiếm',
    'Chương 4: Đồ thị và giải thuật tìm đường'
  ];
  const sorts = ['Quick Sort', 'Merge Sort', 'Bubble Sort', 'Insertion Sort', 'Heap Sort'];
  for (let i = 1; i <= 250; i++) {
    const sortAlg = sorts[i % sorts.length];
    const nElements = 100 * i;
    const chap = dsaChapters[i % dsaChapters.length];
    seeds.push({
      subject: 'Cấu trúc dữ liệu và giải thuật',
      chapter: chap,
      question: `Câu hỏi DSA ${i}: Cho thuật toán ${sortAlg} chạy trên mảng có kích thước n = ${nElements} phần tử. Độ phức tạp thời gian trong trường hợp trung bình là gì?`,
      answer: sortAlg === 'Bubble Sort' || sortAlg === 'Insertion Sort' ? 'O(n^2)' : 'O(n log n)',
      explanation: `Thuật toán ${sortAlg} có độ phức tạp trung bình là ${sortAlg === 'Bubble Sort' || sortAlg === 'Insertion Sort' ? 'O(n^2) do sử dụng hai vòng lặp lồng nhau.' : 'O(n log n) dựa trên phương pháp chia để trị.'}`,
      tags: `dsa,giai thuat,sap xep,${sortAlg.toLowerCase().replace(' ', '')},cau-${i}`
    });
  }

  // 3. Physics (200 questions)
  const physicsChapters = [
    'Chương 1: Động học chất điểm',
    'Chương 2: Động lực học chất điểm',
    'Chương 3: Công và Năng lượng',
    'Chương 4: Nhiệt động học cơ bản'
  ];
  for (let i = 1; i <= 200; i++) {
    const m = 2 * i;
    const a = 3 + i % 5;
    const chap = physicsChapters[i % physicsChapters.length];
    seeds.push({
      subject: 'Vật lý đại cương',
      chapter: chap,
      question: `Câu hỏi Vật lý ${i}: Một vật có khối lượng m = ${m} kg chuyển động với gia tốc a = ${a} m/s^2. Hãy xác định độ lớn lực tác dụng F lên vật theo định luật II Newton.`,
      answer: `F = ${m * a} N`,
      explanation: `Áp dụng công thức định luật II Newton: F = m * a. Thay số: F = ${m} * ${a} = ${m * a} Newton.`,
      tags: `vat ly,newton,luc,co hoc,cau-${i}`
    });
  }

  // 4. Web Development (200 questions)
  const webChapters = [
    'Chương 1: HTML5 và CSS3 nâng cao',
    'Chương 2: JavaScript ES6+ và DOM',
    'Chương 3: React 19 và State Management',
    'Chương 4: Giao thức mạng và HTTP'
  ];
  const statuses = [200, 201, 301, 400, 401, 403, 404, 500];
  for (let i = 1; i <= 200; i++) {
    const status = statuses[i % statuses.length];
    const chap = webChapters[i % webChapters.length];
    
    let answerText = '';
    let expText = '';
    if (status === 200) { answerText = 'OK'; expText = 'Yêu cầu thành công.'; }
    else if (status === 201) { answerText = 'Created'; expText = 'Tạo tài nguyên thành công.'; }
    else if (status === 301) { answerText = 'Moved Permanently'; expText = 'Tài nguyên đã được chuyển vĩnh viễn.'; }
    else if (status === 400) { answerText = 'Bad Request'; expText = 'Yêu cầu không hợp lệ.'; }
    else if (status === 401) { answerText = 'Unauthorized'; expText = 'Yêu cầu chưa được xác thực.'; }
    else if (status === 403) { answerText = 'Forbidden'; expText = 'Không có quyền truy cập.'; }
    else if (status === 404) { answerText = 'Not Found'; expText = 'Không tìm thấy tài nguyên.'; }
    else { answerText = 'Internal Server Error'; expText = 'Lỗi hệ thống phía máy chủ.'; }

    seeds.push({
      subject: 'Lập trình Web nâng cao',
      chapter: chap,
      question: `Câu hỏi Web ${i}: Ý nghĩa của mã trạng thái phản hồi HTTP ${status} là gì?`,
      answer: answerText,
      explanation: `Mã HTTP ${status} tương ứng với trạng thái: ${answerText}. Ý nghĩa: ${expText}`,
      tags: `web,http,giao thuc,status-${status},cau-${i}`
    });
  }

  // 5. Technical English (100 questions)
  const englishChapters = [
    'Chương 1: Từ vựng chuyên ngành CNTT',
    'Chương 2: Ngữ pháp viết tài liệu kỹ thuật',
    'Chương 3: Đọc hiểu tài liệu API'
  ];
  const verbs = ['optimize', 'integrate', 'implement', 'compile', 'debug'];
  for (let i = 1; i <= 100; i++) {
    const verb = verbs[i % verbs.length];
    const chap = englishChapters[i % englishChapters.length];
    seeds.push({
      subject: 'Tiếng Anh chuyên ngành',
      chapter: chap,
      question: `Câu hỏi English ${i}: Fill in the blank: "To improve performance, we need to ___ our database indexing strategy."`,
      answer: verb,
      explanation: `Từ phù hợp nhất để điền vào chỗ trống là "${verb}". Câu hoàn chỉnh nghĩa là: "Để cải thiện hiệu năng, chúng ta cần tối ưu/tích hợp/triển khai/biên dịch/gỡ lỗi chiến lược lập chỉ mục cơ sở dữ liệu."`,
      tags: `tieng anh,english,tu vung,cau-${i}`
    });
  }

  // Bulk Insert in transaction
  db.run('BEGIN TRANSACTION;');
  const stmt = db.prepare(`
    INSERT INTO questions (subject, chapter, question, question_clean, answer, explanation, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of seeds) {
    const cleanQuestion = removeVietnameseAccents(q.question);
    stmt.run([
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
}

/**
 * Saves current SQLite database state into IndexedDB cache
 */
async function saveDatabaseToCache(): Promise<number> {
  if (!db) return 0;
  const binaryDb = db.export();
  await localforage.setItem(DB_CACHE_KEY, binaryDb.buffer);
  return binaryDb.byteLength;
}

/**
 * Normalizes user queries for FTS5 syntax, generating prefix searches
 */
function formatFtsQuery(query: string): string {
  const clean = removeVietnameseAccents(query);
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '';
  return words.map(w => `${w}*`).join(' AND ');
}

// Message Router
self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    switch (type) {
      case 'init': {
        const info = await initDatabase();
        self.postMessage({ type, id, success: true, payload: info });
        break;
      }

      case 'search': {
        if (!db) throw new Error('Database not initialized');
        const { query, filters, page = 1, pageSize = 20 } = payload;
        const offset = (page - 1) * pageSize;

        let sql = `SELECT q.id, q.subject, q.chapter, q.question, q.answer, q.explanation, q.tags, q.created_at FROM questions q`;
        const params: any[] = [];
        const conditions: string[] = [];

        // Full text search join
        const ftsQuery = formatFtsQuery(query);
        if (ftsQuery) {
          sql += ` INNER JOIN (
            SELECT id FROM questions_fts 
            WHERE questions_fts MATCH ?
          ) fts ON q.id = fts.id`;
          params.push(ftsQuery);
        }

        // Apply filters
        if (filters.subject) {
          conditions.push('q.subject = ?');
          params.push(filters.subject);
        }
        if (filters.chapter) {
          conditions.push('q.chapter = ?');
          params.push(filters.chapter);
        }
        if (filters.tag) {
          conditions.push('q.tags LIKE ?');
          params.push(`%${filters.tag}%`);
        }

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }

        // Clone parameters for count query
        const countParams = [...params];

        // Total count query
        let countSql = `SELECT COUNT(*) as count FROM questions q`;
        if (ftsQuery) {
          countSql += ` INNER JOIN (
            SELECT id FROM questions_fts 
            WHERE questions_fts MATCH ?
          ) fts ON q.id = fts.id`;
        }
        if (conditions.length > 0) {
          countSql += ' WHERE ' + conditions.join(' AND ');
        }

        const countStmt = db.prepare(countSql);
        countStmt.bind(countParams);
        let total = 0;
        if (countStmt.step()) {
          total = countStmt.getAsObject().count as number;
        }
        countStmt.free();

        // Add sorting, limit and offset
        sql += ` ORDER BY q.id DESC LIMIT ? OFFSET ?`;
        params.push(pageSize, offset);

        const t0 = performance.now();
        const stmt = db.prepare(sql);
        stmt.bind(params);
        
        const questions: Question[] = [];
        while (stmt.step()) {
          const row = stmt.getAsObject();
          questions.push({
            id: row.id as number,
            subject: row.subject as string,
            chapter: row.chapter as string,
            question: row.question as string,
            answer: row.answer as string,
            explanation: row.explanation as string | null,
            tags: row.tags as string | null,
            created_at: row.created_at as string
          });
        }
        stmt.free();
        const t1 = performance.now();

        self.postMessage({
          type,
          id,
          success: true,
          payload: {
            questions,
            total,
            timeMs: t1 - t0
          }
        });
        break;
      }

      case 'getById': {
        if (!db) throw new Error('Database not initialized');
        const stmt = db.prepare('SELECT * FROM questions WHERE id = ?');
        stmt.bind([payload.id]);
        
        let question: Question | null = null;
        if (stmt.step()) {
          const row = stmt.getAsObject();
          question = {
            id: row.id as number,
            subject: row.subject as string,
            chapter: row.chapter as string,
            question: row.question as string,
            answer: row.answer as string,
            explanation: row.explanation as string | null,
            tags: row.tags as string | null,
            created_at: row.created_at as string
          };
        }
        stmt.free();

        self.postMessage({ type, id, success: true, payload: question });
        break;
      }

      case 'getFiltersData': {
        if (!db) throw new Error('Database not initialized');

        // Extract distinct subjects
        const subjects: string[] = [];
        let stmt = db.prepare('SELECT DISTINCT subject FROM questions ORDER BY subject ASC');
        while (stmt.step()) {
          subjects.push(stmt.getAsObject().subject as string);
        }
        stmt.free();

        // Extract distinct tags
        const tagsSet = new Set<string>();
        stmt = db.prepare('SELECT DISTINCT tags FROM questions WHERE tags IS NOT NULL');
        while (stmt.step()) {
          const rawTags = stmt.getAsObject().tags as string;
          rawTags.split(',').forEach(t => {
            const trimmed = t.trim();
            if (trimmed) tagsSet.add(trimmed);
          });
        }
        stmt.free();

        self.postMessage({
          type,
          id,
          success: true,
          payload: {
            subjects,
            tags: Array.from(tagsSet).sort()
          }
        });
        break;
      }

      case 'getChapters': {
        if (!db) throw new Error('Database not initialized');
        const { subject } = payload;
        
        const chapters: string[] = [];
        let stmt;
        if (subject) {
          stmt = db.prepare('SELECT DISTINCT chapter FROM questions WHERE subject = ? ORDER BY chapter ASC');
          stmt.bind([subject]);
        } else {
          stmt = db.prepare('SELECT DISTINCT chapter FROM questions ORDER BY chapter ASC');
        }

        while (stmt.step()) {
          chapters.push(stmt.getAsObject().chapter as string);
        }
        stmt.free();

        self.postMessage({ type, id, success: true, payload: chapters });
        break;
      }

      case 'importDatabase': {
        const fileBuffer = payload.file; // ArrayBuffer
        const newDb = new SQL.Database(new Uint8Array(fileBuffer));
        
        // Basic schema validation
        const checkStmt = newDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='questions'");
        const tableExists = checkStmt.step();
        checkStmt.free();

        if (!tableExists) {
          newDb.close();
          throw new Error('Database does not contain standard "questions" table.');
        }

        if (db) {
          db.close();
        }

        db = newDb;
        createSchema();
        const newSize = await saveDatabaseToCache();

        self.postMessage({ type, id, success: true, payload: { size: newSize } });
        break;
      }

      case 'importJson': {
        if (!db) throw new Error('Database not initialized');
        const { questions } = payload;

        db.run('BEGIN TRANSACTION;');
        try {
          const stmt = db.prepare(`
            INSERT INTO questions (subject, chapter, question, question_clean, answer, explanation, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          for (const q of questions) {
            const cleanQuestion = removeVietnameseAccents(q.question);
            stmt.run([
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
        } catch (err) {
          db.run('ROLLBACK;');
          throw err;
        }

        const size = await saveDatabaseToCache();
        self.postMessage({ type, id, success: true, payload: { size } });
        break;
      }

      case 'exportDatabase': {
        if (!db) throw new Error('Database not initialized');
        const binaryDb = db.export();
        const buffer = binaryDb.buffer as ArrayBuffer;
        ;(self as unknown as Worker).postMessage({ type, id, success: true, payload: buffer }, [buffer]);
        break;
      }

      case 'clearDatabase': {
        db = new SQL.Database();
        createSchema();
        await saveDatabaseToCache();
        self.postMessage({ type, id, success: true, payload: { size: 0 } });
        break;
      }

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  } catch (err: any) {
    self.postMessage({ type, id, success: false, error: err.message || 'Worker process error' });
  }
};
