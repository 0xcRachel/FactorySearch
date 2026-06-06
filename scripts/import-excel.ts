import xlsx from 'xlsx';
import fs from 'fs';
import { RawQuestion } from './import-csv';

/**
 * Parses questions from an Excel sheet (.xlsx, .xls)
 */
export function parseExcel(filePath: string): RawQuestion[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<any>(sheet);

  const results: RawQuestion[] = [];
  for (const row of rows) {
    // Standardize keys (case insensitive)
    const item: any = {};
    Object.keys(row).forEach(k => {
      item[k.toLowerCase().trim()] = row[k];
    });

    if (item.question && item.answer) {
      results.push({
        subject: item.subject || 'Tổng hợp',
        chapter: item.chapter || 'Chương chung',
        question: String(item.question),
        answer: String(item.answer),
        explanation: item.explanation ? String(item.explanation) : '',
        tags: item.tags ? String(item.tags) : ''
      });
    }
  }

  return results;
}
