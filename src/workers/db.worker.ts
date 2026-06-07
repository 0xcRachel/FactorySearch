import initSqlJs, { type Database } from 'sql.js';
import localforage from 'localforage';
import { removeVietnameseAccents } from '../utils/text';
import type { Question } from '../types';
import { hubtQuestions } from '../data/hubtQuestions';


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

  // Load sql.js WASM — use absolute URL so iOS PWA resolves it correctly
  SQL = await initSqlJs({
    locateFile: (file) => `${self.location.origin}/${file}`
  });

  // Attempt to load database from IndexedDB cache
  const cachedDbArray: ArrayBuffer | null = await localforage.getItem(DB_CACHE_KEY);

  if (cachedDbArray) {
    db = new SQL.Database(new Uint8Array(cachedDbArray));
    // Run schema update/check to ensure compatibility
    createSchema();

    // Check and migrate/seed HUBT questions if missing or incomplete
    try {
      if (db) {
        const result = db.exec("SELECT COUNT(*) FROM questions WHERE school = 'HUBT' AND subject = 'Tin học 2'");
        const count = result[0]?.values[0]?.[0] || 0;
        if (Number(count) < 75) {
          console.log('HUBT Tin học 2 questions missing or incomplete in cache. Seeding...');
          db.run("DELETE FROM questions WHERE school = 'HUBT' AND subject = 'Tin học 2'");
          db.run('BEGIN TRANSACTION;');
          const stmt = db.prepare(`
            INSERT INTO questions (school, subject, chapter, question, question_clean, answer, explanation, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const q of hubtQuestions) {
            const cleanQuestion = removeVietnameseAccents(q.question);
            stmt.run([
              q.school,
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
          const newSize = await saveDatabaseToCache();
          return { size: newSize, source: 'indexeddb' };
        }
      }
    } catch (err) {
      console.error('Error during HUBT database migration:', err);
    }

    return { size: cachedDbArray.byteLength, source: 'indexeddb' };
  } else {
    // Create new database and build schema
    db = new SQL.Database();
    createSchema();

    // Seed with 1000+ realistic questions
    console.log('Database cache empty. Seeding 1,000+ offline questions...');
    await seedDatabase();

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

  // Migrate older DBs that do not have school column
  try {
    db.run("ALTER TABLE questions ADD COLUMN school TEXT;");
  } catch (e) {
    // Column already exists or table is new
  }

  // Create virtual FTS table (with drop to recreate with school column if needed)
  try {
    db.run("DROP TABLE IF EXISTS questions_fts;");
    db.run(`
      CREATE VIRTUAL TABLE questions_fts USING fts5(
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
    console.error('Error creating questions_fts table:', e);
  }

  // Triggers for syncing standard tables and virtual FTS5 tables
  try {
    db.run(`
      DROP TRIGGER IF EXISTS questions_after_insert;
      CREATE TRIGGER questions_after_insert AFTER INSERT ON questions BEGIN
        INSERT INTO questions_fts(id, school, subject, chapter, question, question_clean, tags)
        VALUES (new.id, new.school, new.subject, new.chapter, new.question, new.question_clean, new.tags);
      END;

      DROP TRIGGER IF EXISTS questions_after_delete;
      CREATE TRIGGER questions_after_delete AFTER DELETE ON questions BEGIN
        DELETE FROM questions_fts WHERE id = old.id;
      END;

      DROP TRIGGER IF EXISTS questions_after_update;
      CREATE TRIGGER questions_after_update AFTER UPDATE ON questions BEGIN
        DELETE FROM questions_fts WHERE id = old.id;
        INSERT INTO questions_fts(id, school, subject, chapter, question, question_clean, tags)
        VALUES (new.id, new.school, new.subject, new.chapter, new.question, new.question_clean, new.tags);
      END;
    `);
  } catch (e) {
    console.error('Error creating triggers:', e);
  }
}

/**
 * Seeds the database with 1000+ mock questions across subjects
 */
async function seedDatabase() {
  if (!db) return;

  const seeds: any[] = [];

  // 10 câu TEST để xác nhận SQLite hoạt động
  const testQuestions = [
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 1', question: 'SQLite có hoạt động không?\nA. Có\nB. Không\nC. Không biết\nD. Không quan tâm', answer: 'A. Có', explanation: 'Nếu bạn thấy câu này, SQLite đang hoạt động!', tags: 'test,sqlite' },
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 1', question: '1 + 1 = ?\nA. 1\nB. 2\nC. 3\nD. 4', answer: 'B. 2', explanation: 'Phép cộng cơ bản.', tags: 'test,math' },
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 1', question: 'Màu sắc của bầu trời là gì?\nA. Đỏ\nB. Vàng\nC. Xanh\nD. Tím', answer: 'C. Xanh', explanation: 'Bầu trời có màu xanh do tán xạ ánh sáng.', tags: 'test,general' },
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 1', question: 'Nước sôi ở bao nhiêu độ?\nA. 50°C\nB. 75°C\nC. 100°C\nD. 120°C', answer: 'C. 100°C', explanation: 'Nước sôi ở 100°C ở áp suất khí quyển chuẩn.', tags: 'test,science' },
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 2', question: 'Thủ đô của Việt Nam là gì?\nA. TP.HCM\nB. Đà Nẵng\nC. Hải Phòng\nD. Hà Nội', answer: 'D. Hà Nội', explanation: 'Hà Nội là thủ đô của Việt Nam.', tags: 'test,geography' },
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 2', question: 'Ngôn ngữ lập trình nào được dùng để xây dựng web?\nA. Python\nB. JavaScript\nC. C++\nD. Java', answer: 'B. JavaScript', explanation: 'JavaScript là ngôn ngữ phổ biến nhất cho web frontend.', tags: 'test,programming' },
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 2', question: 'HTTP viết tắt của gì?\nA. HyperText Transfer Protocol\nB. High Transfer Text Protocol\nC. Home Transfer Text Process\nD. HyperText Text Protocol', answer: 'A. HyperText Transfer Protocol', explanation: 'HTTP = HyperText Transfer Protocol.', tags: 'test,web' },
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 2', question: 'RAM là viết tắt của?\nA. Read Access Memory\nB. Random Access Memory\nC. Read All Memory\nD. Random All Memory', answer: 'B. Random Access Memory', explanation: 'RAM = Random Access Memory.', tags: 'test,computer' },
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 3', question: 'CPU là gì?\nA. Central Processing Unit\nB. Computer Power Unit\nC. Central Power Unit\nD. Computer Processing Unit', answer: 'A. Central Processing Unit', explanation: 'CPU = Central Processing Unit (Bộ xử lý trung tâm).', tags: 'test,computer' },
    { school: 'TEST', subject: 'Kiểm tra SQLite', chapter: 'Test 3', question: 'SQLite là loại cơ sở dữ liệu gì?\nA. Cơ sở dữ liệu đám mây\nB. Cơ sở dữ liệu nhúng không cần server\nC. Cơ sở dữ liệu NoSQL\nD. Cơ sở dữ liệu phân tán', answer: 'B. Cơ sở dữ liệu nhúng không cần server', explanation: 'SQLite là cơ sở dữ liệu nhúng, lưu trực tiếp trong file, không cần server.', tags: 'test,database,sqlite' },
  ];
  seeds.push(...testQuestions);

  // Nạp 75 câu HUBT Tin học 2 có sẵn
  for (const q of hubtQuestions) {
    seeds.push(q);
  }

  // Bulk Insert in transaction
  db.run('BEGIN TRANSACTION;');
  const stmt = db.prepare(`
    INSERT INTO questions (school, subject, chapter, question, question_clean, answer, explanation, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const totalSeeds = seeds.length;
  for (let i = 0; i < totalSeeds; i++) {
    const q = seeds[i];
    const cleanQuestion = removeVietnameseAccents(q.question);
    stmt.run([
      q.school,
      q.subject,
      q.chapter,
      q.question,
      cleanQuestion,
      q.answer,
      q.explanation || null,
      q.tags || null
    ]);

    if (i > 0 && i % 100 === 0) {
      const percent = Math.floor((i / totalSeeds) * 50); // seeding is first half, saving is second half
      self.postMessage({ type: 'progress', payload: { percent, message: `Đang tạo dữ liệu mẫu (${i}/${totalSeeds})...` } });
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  stmt.free();
  db.run('COMMIT;');
}

/**
 * Saves current SQLite database state into IndexedDB cache
 */
async function saveDatabaseToCache(): Promise<number> {
  if (!db) return 0;
  self.postMessage({ type: 'progress', payload: { percent: 60, message: 'Đang trích xuất cấu trúc dữ liệu...' } });
  const binaryDb = db.export();
  self.postMessage({ type: 'progress', payload: { percent: 80, message: 'Đang lưu vào bộ nhớ đệm trình duyệt...' } });
  await localforage.setItem(DB_CACHE_KEY, binaryDb.buffer);
  self.postMessage({ type: 'progress', payload: { percent: 100, message: 'Hoàn tất lưu trữ offline!' } });
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

        let sql = `SELECT q.id, q.school, q.subject, q.chapter, q.question, q.answer, q.explanation, q.tags, q.created_at FROM questions q`;
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
        if (filters.school) {
          conditions.push('q.school = ?');
          params.push(filters.school);
        }
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
            school: row.school as string | undefined,
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
            school: row.school as string | undefined,
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

      case 'getSchools': {
        if (!db) throw new Error('Database not initialized');
        const schools: string[] = [];
        let stmt;
        try {
          stmt = db.prepare('SELECT DISTINCT school FROM questions WHERE school IS NOT NULL AND school != "" ORDER BY school ASC');
          while (stmt.step()) {
            schools.push(stmt.getAsObject().school as string);
          }
          stmt.free();
        } catch (e) {
          console.warn('School column check failed. Returning empty list.', e);
        }
        self.postMessage({ type, id, success: true, payload: schools });
        break;
      }

      case 'getSubjects': {
        if (!db) throw new Error('Database not initialized');
        const { school } = payload;
        const subjects: string[] = [];
        let stmt;
        if (school) {
          try {
            stmt = db.prepare('SELECT DISTINCT subject FROM questions WHERE school = ? ORDER BY subject ASC');
            stmt.bind([school]);
          } catch (e) {
            stmt = db.prepare('SELECT DISTINCT subject FROM questions ORDER BY subject ASC');
          }
        } else {
          stmt = db.prepare('SELECT DISTINCT subject FROM questions ORDER BY subject ASC');
        }
        while (stmt.step()) {
          subjects.push(stmt.getAsObject().subject as string);
        }
        stmt.free();
        self.postMessage({ type, id, success: true, payload: subjects });
        break;
      }

      case 'getChapters': {
        if (!db) throw new Error('Database not initialized');
        const { subject, school } = payload;

        const chapters: string[] = [];
        const conditions: string[] = [];
        const params: any[] = [];

        if (subject) {
          conditions.push('subject = ?');
          params.push(subject);
        }
        if (school) {
          conditions.push('school = ?');
          params.push(school);
        }

        let sql = 'SELECT DISTINCT chapter FROM questions';
        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' ORDER BY chapter ASC';

        let stmt;
        try {
          stmt = db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
        } catch (e) {
          stmt = db.prepare('SELECT DISTINCT chapter FROM questions' + (subject ? ' WHERE subject = ?' : '') + ' ORDER BY chapter ASC');
          if (subject) stmt.bind([subject]);
        }

        while (stmt.step()) {
          chapters.push(stmt.getAsObject().chapter as string);
        }
        stmt.free();

        self.postMessage({ type, id, success: true, payload: chapters });
        break;
      }

      case 'importDatabase': {
        self.postMessage({ type: 'progress', payload: { percent: 10, message: 'Đang giải mã tệp tin...' } });
        const fileBuffer = payload.file; // ArrayBuffer
        const newDb = new SQL.Database(new Uint8Array(fileBuffer));

        self.postMessage({ type: 'progress', payload: { percent: 30, message: 'Đang kiểm tra cấu trúc dữ liệu...' } });
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
          self.postMessage({ type: 'progress', payload: { percent: 10, message: 'Đang chuẩn bị chèn dữ liệu JSON...' } });
          const stmt = db.prepare(`
            INSERT INTO questions (school, subject, chapter, question, question_clean, answer, explanation, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const totalJson = questions.length;
          for (let i = 0; i < totalJson; i++) {
            const q = questions[i];
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

            if (i > 0 && i % 50 === 0) {
              const percent = 10 + Math.floor((i / totalJson) * 40);
              self.postMessage({ type: 'progress', payload: { percent, message: `Đang chèn câu hỏi (${i}/${totalJson})...` } });
            }
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
        ; (self as unknown as Worker).postMessage({ type, id, success: true, payload: buffer }, [buffer]);
        break;
      }

      case 'clearDatabase': {
        self.postMessage({ type: 'progress', payload: { percent: 10, message: 'Đang xóa dữ liệu cũ...' } });
        if (db) {
          db.close();
          db = null;
        }
        await localforage.removeItem(DB_CACHE_KEY);

        self.postMessage({ type: 'progress', payload: { percent: 30, message: 'Đang khởi tạo lại cơ sở dữ liệu...' } });
        const info = await initDatabase(); // This will hit the 'else' block and call seedDatabase() + saveDatabaseToCache()

        self.postMessage({ type, id, success: true, payload: { size: info.size } });
        break;
      }

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  } catch (err: any) {
    self.postMessage({ type, id, success: false, error: err.message || 'Worker process error' });
  }
};
