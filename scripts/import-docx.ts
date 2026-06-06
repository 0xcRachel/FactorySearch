import mammoth from 'mammoth';
import fs from 'fs';
import { RawQuestion } from './import-csv';

/**
 * Parses questions from Word Document (.docx)
 */
export async function parseDocx(filePath: string): Promise<RawQuestion[]> {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }

  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  return parseExamText(text);
}

/**
 * Shared parser that parses structured text (PDF text, Docx text) 
 * matching typical Vietnamese question formats.
 */
export function parseExamText(text: string): RawQuestion[] {
  const results: RawQuestion[] = [];
  if (!text) return [];

  // Match questions starting with "Câu [số]"
  const questionBlocks = text.split(/(?=Câu\s+\d+[:\s.-])/gi);

  for (const block of questionBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    // Regex to split question + choices, correct answer, and explanation
    const answerIndex = trimmedBlock.search(/(?:Đáp\s*án|Chọn|Đáp\s*án\s*đúng)\s*[:\s.-]/i);
    
    let mainBody = trimmedBlock;
    let answerPart = '';
    let explanationPart = '';

    if (answerIndex !== -1) {
      mainBody = trimmedBlock.substring(0, answerIndex).trim();
      const rest = trimmedBlock.substring(answerIndex).trim();
      
      // Look for explanation marker
      const expIndex = rest.search(/(?:Lời\s*giải|Giải\s*thích|Chi\s*tiết|Hướng\s*dẫn)\s*[:\s.-]/i);
      
      if (expIndex !== -1) {
        answerPart = rest.substring(0, expIndex).trim();
        explanationPart = rest.substring(expIndex).trim();
      } else {
        answerPart = rest;
      }
    }

    // Extract Question Content (removing "Câu X:")
    const questionHeaderMatch = mainBody.match(/^Câu\s+\d+[:\s.-]*(.*)/is);
    const questionContent = questionHeaderMatch ? questionHeaderMatch[1].trim() : mainBody;

    if (!questionContent) continue;

    // Extract Answer value
    const answerValueMatch = answerPart.match(/(?:Đáp\s*án|Chọn|Đáp\s*án\s*đúng)\s*[:\s.-]*\s*([A-D]|[a-d]|[^.\n]+)/i);
    const answer = answerValueMatch ? answerValueMatch[1].trim().toUpperCase() : 'Chưa rõ';

    // Extract Explanation content
    const expContentMatch = explanationPart.match(/(?:Lời\s*giải|Giải\s*thích|Chi\s*tiết|Hướng\s*dẫn)\s*[:\s.-]*(.*)/is);
    const explanation = expContentMatch ? expContentMatch[1].trim() : '';

    results.push({
      subject: 'Tổng hợp',
      chapter: 'Tài liệu Word',
      question: questionContent,
      answer: answer,
      explanation: explanation,
      tags: 'word-import'
    });
  }

  return results;
}
