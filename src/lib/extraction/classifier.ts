/**
 * Content-based file classification (MGMT-05, D-09).
 *
 * Corrects extension-based fileType classification using content analysis.
 * Stub module -- will be replaced by Phase 8 full implementation.
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

  if (ext !== '.json') {
    return { correctedType: null, classification: null };
  }

  const content = extractedContent || extractedMarkdown;
  if (!content) {
    return { correctedType: null, classification: null };
  }

  try {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
      const allObjects = parsed.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
      if (allObjects) {
        return { correctedType: 'data', classification: 'auto:json_array_data' };
      }
    }

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed);
      const stringValues = keys.filter(k => typeof parsed[k] === 'string').length;
      const totalValues = keys.length;
      if (totalValues > 0 && (stringValues / totalValues) > 0.5) {
        return { correctedType: 'code', classification: 'auto:json_config' };
      }
    }
  } catch {
    // JSON parse failed
  }

  return { correctedType: null, classification: null };
}
