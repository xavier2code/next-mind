import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('A2A Infrastructure Migration', () => {
  const drizzleDir = join(process.cwd(), 'drizzle');

  it('should have a migration file for agent tables', () => {
    expect(existsSync(drizzleDir)).toBe(true);

    const files = readdirSync(drizzleDir);
    const migrationFile = files.find(f =>
      f.includes('agent') || f.includes('workflow') || f.includes('task')
    );

    expect(migrationFile).toBeDefined();
  });

  it('should have migration SQL that creates agent table', () => {
    const files = readdirSync(drizzleDir);
    const migrationFile = files.find(f =>
      f.endsWith('.sql') && (f.includes('agent') || f.includes('workflow') || f.includes('task'))
    );

    if (migrationFile) {
      const content = readFileSync(join(drizzleDir, migrationFile), 'utf-8');
      expect(content.toLowerCase()).toContain('create table');
      expect(content.toLowerCase()).toContain('agent');
    }
  });

  it('should have migration SQL that creates workflow table', () => {
    const files = readdirSync(drizzleDir);
    const migrationFile = files.find(f =>
      f.endsWith('.sql') && (f.includes('agent') || f.includes('workflow') || f.includes('task'))
    );

    if (migrationFile) {
      const content = readFileSync(join(drizzleDir, migrationFile), 'utf-8');
      expect(content.toLowerCase()).toContain('workflow');
    }
  });

  it('should have migration SQL that creates task table', () => {
    const files = readdirSync(drizzleDir);
    const migrationFile = files.find(f =>
      f.endsWith('.sql') && (f.includes('agent') || f.includes('workflow') || f.includes('task'))
    );

    if (migrationFile) {
      const content = readFileSync(join(drizzleDir, migrationFile), 'utf-8');
      expect(content.toLowerCase()).toContain('task');
    }
  });

  it('should have foreign key constraints in migration', () => {
    const files = readdirSync(drizzleDir);
    const migrationFile = files.find(f =>
      f.endsWith('.sql') && (f.includes('agent') || f.includes('workflow') || f.includes('task'))
    );

    if (migrationFile) {
      const content = readFileSync(join(drizzleDir, migrationFile), 'utf-8');
      expect(content.toLowerCase()).toContain('references');
    }
  });

  it('should have indexes in migration', () => {
    const files = readdirSync(drizzleDir);
    const migrationFile = files.find(f =>
      f.endsWith('.sql') && (f.includes('agent') || f.includes('workflow') || f.includes('task'))
    );

    if (migrationFile) {
      const content = readFileSync(join(drizzleDir, migrationFile), 'utf-8');
      expect(content.toLowerCase()).toContain('index');
    }
  });
});
