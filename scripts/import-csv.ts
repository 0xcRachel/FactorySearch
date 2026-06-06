import fs from 'fs';

export interface RawQuestion {
  subject: string;
  chapter: string;
  question: string;
  answer: string;
  explanation?: string;
  tags?: string;
}

/**
 * Custom robust CSV parser to avoid library loading issues.
 * Correctly handles nested quotes, commas, and line endings.
 */
export function parseCSV(filePath: string): RawQuestion[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines: string[] = [];
  let currentLine = '';
  let insideQuote = false;

  // Split lines accounting for multiline quoted text
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      insideQuote = !insideQuote;
      currentLine += char;
    } else if (char === '\n' && !insideQuote) {
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine) lines.push(currentLine);

  if (lines.length === 0) return [];

  // Parse Headers
  const parseRow = (rowText: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let inQuote = false;

    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        fields.push(field.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        field = '';
      } else {
        field += char;
      }
    }
    fields.push(field.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return fields;
  };

  const headers = parseRow(lines[0]);
  const results: RawQuestion[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseRow(line);
    const item: any = {};
    
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      item[key] = values[index] || '';
    });

    if (item.question && item.answer) {
      results.push({
        subject: item.subject || 'Tổng hợp',
        chapter: item.chapter || 'Chương chung',
        question: item.question,
        answer: item.answer,
        explanation: item.explanation || '',
        tags: item.tags || ''
      });
    }
  }

  return results;
}
