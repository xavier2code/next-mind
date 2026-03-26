/**
 * Rule-based PDF text to Markdown converter (D-11).
 *
 * Converts raw text extracted by unpdf into Markdown using heuristics:
 * - Heading detection: ALL-CAPS lines or numbered patterns
 * - List detection: lines starting with -, *, or o
 * - Numbered list: lines matching ^\d+\.\s
 * - Paragraphs: consecutive non-empty lines separated by blank lines
 *
 * No external library -- pure string manipulation.
 */

/**
 * Convert raw PDF text to Markdown using rule-based heuristics.
 *
 * @param text - Raw text extracted from a PDF
 * @returns Markdown-formatted string
 */
export function textToMarkdown(text: string): string {
  if (!text || !text.trim()) {
    return '';
  }

  const lines = text.split('\n');
  const output: string[] = [];
  let inParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line -- paragraph break
    if (trimmed === '') {
      if (inParagraph) {
        output.push(''); // End paragraph with blank line
        inParagraph = false;
      }
      continue;
    }

    // Sub-heading: numbered pattern like "1.1", "2.3", etc. followed by ALL-CAPS text
    // Must check before ALL-CAPS since "1.1 OVERVIEW" is also ALL-CAPS
    const subHeadingMatch = trimmed.match(/^(\d+\.\d+)\s+(.+)/);
    if (subHeadingMatch && !trimmed.match(/^\d+\.\d+\.\s/)) {
      const afterNumber = subHeadingMatch[2].trim();
      if (afterNumber.length > 0 && afterNumber === afterNumber.toUpperCase() && /[A-Z]/.test(afterNumber)) {
        if (inParagraph) {
          output.push('');
          inParagraph = false;
        }
        output.push(`### ${trimmed}`);
        output.push('');
        continue;
      }
    }

    // Main heading: numbered pattern like "1.", "2." followed by ALL-CAPS text
    // Must check before plain ALL-CAPS since "1. TITLE" is also ALL-CAPS
    const mainHeadingMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (mainHeadingMatch) {
      const afterNumber = mainHeadingMatch[2].trim();
      if (afterNumber.length > 3 && afterNumber === afterNumber.toUpperCase() && /[A-Z]/.test(afterNumber)) {
        if (inParagraph) {
          output.push('');
          inParagraph = false;
        }
        output.push(`## ${trimmed}`);
        output.push('');
        continue;
      }
      // Otherwise it's a numbered list item -- keep as-is (falls through to numbered list check)
    }

    // Heading detection: ALL-CAPS line (>3 chars, no lowercase)
    if (trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      if (inParagraph) {
        output.push(''); // Close previous paragraph
        inParagraph = false;
      }
      output.push(`## ${trimmed}`);
      output.push('');
      continue;
    }

    // Bullet list: lines starting with -, *, or o followed by space
    if (/^[-*o]\s/.test(trimmed)) {
      if (inParagraph) {
        output.push('');
        inParagraph = false;
      }
      output.push(trimmed);
      continue;
    }

    // Numbered list: lines matching ^\d+\.\s (kept as-is for Markdown)
    if (/^\d+\.\s/.test(trimmed)) {
      if (inParagraph) {
        output.push('');
        inParagraph = false;
      }
      output.push(trimmed);
      continue;
    }

    // Regular text -- paragraph content
    if (inParagraph) {
      // Append to current paragraph (same line -- PDF text already has line breaks)
      output.push(trimmed);
    } else {
      inParagraph = true;
      output.push(trimmed);
    }
  }

  // Close trailing paragraph if needed
  if (inParagraph) {
    output.push('');
  }

  return output.join('\n').trim();
}
