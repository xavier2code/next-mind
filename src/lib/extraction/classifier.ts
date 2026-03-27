/**
 * Content-based file classification (MGMT-05, D-09).
 *
 * Corrects extension-based fileType classification using content analysis.
 * - .json files: if content is a homogeneous array of objects -> 'data';
 *                if content has many key-value pairs (config pattern) -> 'code'
 * - .csv files: always 'data'
 * - .ts/.js/.tsx/.jsx files: always 'code'
 * - .pdf files: always 'document'
 *
 * Returns null if the current classification is already correct (no change needed).
 */

export interface ClassificationResult {
  correctedType: 'document' | 'code' | 'data' | null;
  classification: string | null;
}

export async function classifyByContent(
  filename: string,
  extractedContent: string | null,
  extractedMarkdown: string | null
): Promise<ClassificationResult> {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();

  // Only .json files need content-based correction (per D-09)
  if (ext !== '.json') {
    return { correctedType: null, classification: null };
  }

  // Try to parse JSON content
  const content = extractedContent || extractedMarkdown;
  if (!content) {
    return { correctedType: null, classification: null };
  }

  try {
    const parsed = JSON.parse(content);

    // If it's an array of objects -> data
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
      // Check if all items are objects (homogeneous array of objects)
      const allObjects = parsed.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
      if (allObjects) {
        return {
          correctedType: 'data',
          classification: 'auto:json_array_data',
        };
      }
    }

    // If it's a single object with key-value pairs -> likely config (code)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed);
      // Config files typically have string values for most keys (key-value pattern)
      const stringValues = keys.filter(k => typeof parsed[k] === 'string').length;
      const totalValues = keys.length;
      // If more than 50% of values are strings, it's likely a config file
      if (totalValues > 0 && (stringValues / totalValues) > 0.5) {
        return {
          correctedType: 'code',
          classification: 'auto:json_config',
        };
      }
    }
  } catch {
    // JSON parse failed, can't classify
  }

  return { correctedType: null, classification: null };
}
