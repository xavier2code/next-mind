import { describe, it, expect } from 'vitest';
import { CodeExtractor } from '@/lib/extraction/extractors/code-extractor';

describe('CodeExtractor', () => {
  const extractor = new CodeExtractor();

  it('wraps TypeScript file in fenced code block with typescript language tag', async () => {
    const code = 'const x: number = 42;';
    const buffer = Buffer.from(code, 'utf-8');
    const result = await extractor.extract(buffer, 'app.ts');

    expect(result.extractedContent).toBe(code);
    expect(result.extractedMarkdown).toBe('```typescript\nconst x: number = 42;\n```');
  });

  it('wraps TSX file in fenced code block with typescript language tag', async () => {
    const code = 'export default function App() { return <div />; }';
    const buffer = Buffer.from(code, 'utf-8');
    const result = await extractor.extract(buffer, 'App.tsx');

    expect(result.extractedMarkdown).toBe('```typescript\nexport default function App() { return <div />; }\n```');
  });

  it('wraps Python file in fenced code block with python language tag', async () => {
    const code = 'print("hello")';
    const buffer = Buffer.from(code, 'utf-8');
    const result = await extractor.extract(buffer, 'script.py');

    expect(result.extractedMarkdown).toBe('```python\nprint("hello")\n```');
  });

  it('wraps JavaScript file in fenced code block with javascript language tag', async () => {
    const code = 'const x = 42;';
    const buffer = Buffer.from(code, 'utf-8');
    const result = await extractor.extract(buffer, 'index.js');

    expect(result.extractedMarkdown).toBe('```javascript\nconst x = 42;\n```');
  });

  it('uses empty language tag for unknown extensions', async () => {
    const code = 'some content';
    const buffer = Buffer.from(code, 'utf-8');
    const result = await extractor.extract(buffer, 'data.xyz');

    expect(result.extractedMarkdown).toBe('```\nsome content\n```');
  });

  it('extractedContent is raw text', async () => {
    const code = 'function hello() { return "world"; }';
    const buffer = Buffer.from(code, 'utf-8');
    const result = await extractor.extract(buffer, 'hello.js');

    expect(result.extractedContent).toBe(code);
  });

  it('empty file returns empty code block', async () => {
    const buffer = Buffer.from('', 'utf-8');
    const result = await extractor.extract(buffer, 'empty.py');

    expect(result.extractedContent).toBe('');
    expect(result.extractedMarkdown).toBe('```python\n\n```');
  });

  it('maps all 17 defined extensions correctly', async () => {
    const extensions: [string, string][] = [
      ['app.ts', 'typescript'],
      ['comp.tsx', 'typescript'],
      ['main.js', 'javascript'],
      ['page.jsx', 'javascript'],
      ['run.py', 'python'],
      ['Main.java', 'java'],
      ['server.go', 'go'],
      ['lib.rs', 'rust'],
      ['main.c', 'c'],
      ['header.h', 'c'],
      ['calc.cpp', 'cpp'],
      ['style.css', 'css'],
      ['index.html', 'html'],
      ['data.json', 'json'],
      ['config.yaml', 'yaml'],
      ['config2.yml', 'yaml'],
      ['readme.md', 'markdown'],
      ['query.sql', 'sql'],
      ['run.sh', 'bash'],
      ['run.bash', 'bash'],
      ['run.zsh', 'bash'],
    ];

    for (const [filename, expectedLang] of extensions) {
      const buffer = Buffer.from('test', 'utf-8');
      const result = await extractor.extract(buffer, filename);
      expect(result.extractedMarkdown).toBe(`\`\`\`${expectedLang}\ntest\n\`\`\``);
    }
  });
});
