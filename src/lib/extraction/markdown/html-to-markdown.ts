/**
 * HTML to Markdown converter using turndown.
 *
 * Used by DocxExtractor to convert mammoth HTML output to Markdown.
 * turndown is loaded via dynamic import() per D-04 to bypass Turbopack.
 */

/**
 * Convert HTML string to Markdown using turndown.
 *
 * @param html - HTML string (typically from mammoth.convertToHtml())
 * @returns Markdown string
 */
export async function htmlToMarkdown(html: string): Promise<string> {
  if (!html || !html.trim()) {
    return '';
  }

  const { default: TurndownService } = await import('turndown');

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  return turndownService.turndown(html);
}
