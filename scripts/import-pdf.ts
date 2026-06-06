import fs from 'fs';
import pdf from 'pdf-parse';
import { RawQuestion, parseExamText } from './import-docx';

/**
 * Parses questions from PDF Document (.pdf)
 */
export async function parsePdf(filePath: string): Promise<RawQuestion[]> {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }

  const dataBuffer = fs.readFileSync(filePath);
  const parsedData = await pdf(dataBuffer);
  return parseExamText(parsedData.text);
}
