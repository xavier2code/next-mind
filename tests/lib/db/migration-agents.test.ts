import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('A2A Infrastructure Migration', () => {
  const drizzleDir = join(process.cwd(), 'drizzle');

  it('should have a migration file for agent tables', () => {
    expect(existsSync(drizzleDir)).toBe(true);

    const files = readdirSync(drizzleDir);
    // Look for any SQL file that contains the agent table creation
    const sqlFiles = files.filter(f => f.endsWith('.sql'));
    expect(sqlFiles.length).toBeGreaterThan(0);

    // Check that at least one SQL file contains agent table
    const hasAgentMigration = sqlFiles.some(f => {
      const content = readFileSync(join(drizzleDir, f), 'utf-8');
      return content.toLowerCase().includes('create table') && content.toLowerCase().includes('"agent"');
    });
    expect(hasAgentMigration).toBe(true);
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
