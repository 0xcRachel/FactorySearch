/**
 * Removes Vietnamese diacritics/accents from a string and converts to lowercase.
 * This is used for generating clean search tokens in FTS5 databases.
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Highlights matches of the query inside a text.
 * Returns an array of text segments with matching indicators for custom React rendering.
 */
export interface TextSegment {
  text: string;
  isMatch: boolean;
}

export function highlightKeywords(text: string, query: string): TextSegment[] {
  if (!text) return [];
  if (!query) return [{ text, isMatch: false }];

  const cleanQuery = removeVietnameseAccents(query).trim();
  if (!cleanQuery) return [{ text, isMatch: false }];

  // Split query into terms
  const terms = cleanQuery.split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return [{ text, isMatch: false }];

  // Find matches using regex on clean text, but map back to original text index
  // A simple and reliable way is to search by individual words or the whole phrase.
  // We can build a regex that matches the phrase
  try {
    // Escape regex characters
    const escapedTerms = terms.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    // Match any of the words
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    
    // To match accented text with unaccented query, we can do character-by-character mapping,
    // or run a regex directly on the accented text if the query contains accents.
    // If the query is unaccented, we need to map the characters.
    // A robust, simplified approach for highlighting:
    // Create an unaccented representation of the source text, find the matches,
    // and extract the corresponding slices from the original text.
    const cleanText = removeVietnameseAccents(text);
    const matches: { start: number; end: number }[] = [];
    
    // Search for the full clean query first
    let index = cleanText.indexOf(cleanQuery);
    if (index !== -1) {
      matches.push({ start: index, end: index + cleanQuery.length });
    } else {
      // Search for individual words
      for (const term of terms) {
        let pos = 0;
        while ((pos = cleanText.indexOf(term, pos)) !== -1) {
          matches.push({ start: pos, end: pos + term.length });
          pos += term.length;
        }
      }
    }

    // Merge overlapping matches
    matches.sort((a, b) => a.start - b.start);
    const mergedMatches: { start: number; end: number }[] = [];
    for (const match of matches) {
      if (mergedMatches.length === 0) {
        mergedMatches.push(match);
      } else {
        const last = mergedMatches[mergedMatches.length - 1];
        if (match.start <= last.end) {
          last.end = Math.max(last.end, match.end);
        } else {
          mergedMatches.push(match);
        }
      }
    }

    // Slice the original text
    const segments: TextSegment[] = [];
    let lastIndex = 0;
    for (const match of mergedMatches) {
      if (match.start > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, match.start),
          isMatch: false
        });
      }
      segments.push({
        text: text.substring(match.start, match.end),
        isMatch: true
      });
      lastIndex = match.end;
    }
    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
        isMatch: false
      });
    }

    return segments;
  } catch (e) {
    return [{ text, isMatch: false }];
  }
}
