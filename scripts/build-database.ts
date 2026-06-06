import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { removeVietnameseAccents } from '../src/utils/text.js';
import { parseCSV, RawQuestion } from './import-csv.js';
import { parseExcel } from './import-excel.js';
import { parseDocx } from './import-docx.js';
import { parsePdf } from './import-pdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate 1,000+ unique question seeds if no external files
function generateSeedQuestions(): RawQuestion[] {
  const seeds: RawQuestion[] = [];
  
  // 1. Math Questions (300 questions)
  const mathChapters = [
    'Chương 1: Đạo hàm và ứng dụng',
    'Chương 2: Tích phân và hình học',
    'Chương 3: Phương trình vi phân',
    'Chương 4: Chuỗi số và chuỗi hàm'
  ];
  for (let i = 1; i <= 300; i++) {
    const a = i * 2 + 1;
    const b = i + 3;
    const chap = mathChapters[i % mathChapters.length];
    seeds.push({
      subject: 'Toán Giải Tích',
      chapter: chap,
      question: `Câu hỏi Toán ${i}: Cho hàm số y = ${a}x^2 + ${b}x + ${i}. Hãy tính đạo hàm bậc nhất y' của hàm số này tại điểm x = 1.`,
      answer: `y'(1) = ${a * 2 + b}`,
      explanation: `Ta có y' = ${a * 2}x + ${b}. Thế x = 1 vào đạo hàm: y'(1) = ${a * 2}*1 + ${b} = ${a * 2 + b}.`,
      tags: `toán,đạo hàm,giải tích,câu-${i}`
    });
  }

  // 2. Data Structures & Algorithms (300 questions)
  const dsaChapters = [
    'Chương 1: Cấu trúc tuần tự và ngăn xếp',
    'Chương 2: Cây nhị phân và cây cân bằng',
    'Chương 3: Thuật toán sắp xếp và tìm kiếm',
    'Chương 4: Đồ thị và giải thuật tìm đường'
  ];
  const sorts = ['Quick Sort', 'Merge Sort', 'Bubble Sort', 'Insertion Sort', 'Heap Sort'];
  for (let i = 1; i <= 300; i++) {
    const sortAlg = sorts[i % sorts.length];
    const nElements = 100 * i;
    const chap = dsaChapters[i % dsaChapters.length];
    seeds.push({
      subject: 'Cấu trúc dữ liệu và giải thuật',
      chapter: chap,
      question: `Câu hỏi DSA ${i}: Cho thuật toán ${sortAlg} chạy trên mảng có kích thước n = ${nElements} phần tử. Độ phức tạp thời gian trong trường hợp trung bình là gì?`,
      answer: sortAlg === 'Bubble Sort' || sortAlg === 'Insertion Sort' ? 'O(n^2)' : 'O(n log n)',
      explanation: `Thuật toán ${sortAlg} có độ phức tạp trung bình là ${sortAlg === 'Bubble Sort' || sortAlg === 'Insertion Sort' ? 'O(n^2) do sử dụng hai vòng lặp lồng nhau.' : 'O(n log n) dựa trên phương pháp chia để trị.'}`,
      tags: `dsa,giải thuật,sắp xếp,${sortAlg.toLowerCase().replace(' ', '')},câu-${i}`
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
      tags: `vật lý,newton,lực,cơ học,câu-${i}`
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
      tags: `web,http,giao thức,status-${status},câu-${i}`
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
      tags: `tiếng anh,english,từ vựng,câu-${i}`
    });
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

    CREATE TRIGGER IF NOT EXISTS questions_after_insert AFTER INSERT ON questions BEGIN
      INSERT INTO questions_fts(id, subject, chapter, question, question_clean, tags)
      VALUES (new.id, new.subject, new.chapter, new.question, new.question_clean, new.tags);
    END;
  `);

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

  // 4. Nếu tổng số lượng ít hơn 1000 câu hỏi, tự động gieo hạt thêm cho đủ và đa dạng
  if (questionsList.length === 0) {
    console.log('Không tìm thấy tệp dữ liệu ngoài hoặc rỗng. Đang tự động gieo hạt 1,100+ câu hỏi mẫu...');
    questionsList.push(...generateSeedQuestions());
  } else {
    console.log(`Đang gieo thêm câu hỏi mẫu để bổ sung vào ${questionsList.length} câu hỏi ngoài...`);
    questionsList.push(...generateSeedQuestions());
  }

  // 5. Ghi dữ liệu vào database bằng TRANSACTION để tối ưu tốc độ
  db.run('BEGIN TRANSACTION;');
  const stmt = db.prepare(`
    INSERT INTO questions (subject, chapter, question, question_clean, answer, explanation, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of questionsList) {
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
