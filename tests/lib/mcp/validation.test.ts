import { describe, it, expect } from 'vitest';
import {
  sanitizeCommandArg,
  validatePath,
  validateCommand,
  DANGEROUS_PATTERNS,
} from '../../../src/lib/mcp/validation';

describe('sanitizeCommandArg', () => {
  describe('strips dangerous patterns', () => {
    it('should throw on command substitution $()', () => {
      expect(() => sanitizeCommandArg('$(whoami)')).toThrow(/command substitution/i);
    });

    it('should throw on backtick command substitution', () => {
      expect(() => sanitizeCommandArg('`whoami`')).toThrow(/command substitution/i);
    });

    it('should throw on variable expansion ${}', () => {
      expect(() => sanitizeCommandArg('${PATH}')).toThrow(/variable expansion/i);
    });

    it('should throw on pipe character', () => {
      expect(() => sanitizeCommandArg('file | cat')).toThrow(/pipe/i);
    });

    it('should throw on semicolon command separator', () => {
      expect(() => sanitizeCommandArg('file;rm -rf /')).toThrow(/command separator/i);
    });

    it('should throw on logical AND (&&)', () => {
      expect(() => sanitizeCommandArg('file && whoami')).toThrow(/logical/i);
    });

    it('should throw on logical OR (||)', () => {
      // Note: || is caught by the | (pipe) pattern which matches first
      expect(() => sanitizeCommandArg('file || whoami')).toThrow(/pipe|logical/i);
    });

    it('should throw on output redirect (>)', () => {
      expect(() => sanitizeCommandArg('file > /etc/passwd')).toThrow(/redirect/i);
    });

    it('should throw on input redirect (<)', () => {
      expect(() => sanitizeCommandArg('/etc/passwd < file')).toThrow(/redirect/i);
    });

    it('should throw on newline injection', () => {
      expect(() => sanitizeCommandArg('file\nrm -rf /')).toThrow(/newline/i);
    });
  });

  describe('throws on unfixable injection attempts', () => {
    it('should throw on multiple injection patterns combined', () => {
      expect(() => sanitizeCommandArg('$(cat /etc/passwd) | grep root')).toThrow();
    });

    it('should throw on encoded injection attempts', () => {
      // While we don't decode, we should still catch obvious patterns
      expect(() => sanitizeCommandArg('$(echo test)')).toThrow();
    });
  });

  describe('allows safe arguments', () => {
    it('should return safe argument unchanged', () => {
      expect(sanitizeCommandArg('safe-filename.txt')).toBe('safe-filename.txt');
    });

    it('should allow dots in filenames', () => {
      expect(sanitizeCommandArg('file.test.ts')).toBe('file.test.ts');
    });

    it('should allow dashes in arguments', () => {
      expect(sanitizeCommandArg('--help')).toBe('--help');
    });

    it('should allow underscores in arguments', () => {
      expect(sanitizeCommandArg('my_file_name')).toBe('my_file_name');
    });

    it('should allow paths with forward slashes', () => {
      expect(sanitizeCommandArg('src/lib/file.ts')).toBe('src/lib/file.ts');
    });

    it('should allow empty string', () => {
      expect(sanitizeCommandArg('')).toBe('');
    });
  });
});

describe('validatePath', () => {
  const allowedDirs = ['/home/user/project', '/tmp/app'];

  describe('rejects path traversal', () => {
    it('should reject paths containing ../', () => {
      expect(() => validatePath('../../../etc/passwd', allowedDirs)).toThrow(/path traversal/i);
    });

    it('should reject paths containing ~/', () => {
      expect(() => validatePath('~/secrets', allowedDirs)).toThrow(/path traversal/i);
    });

    it('should reject complex path traversal attempts', () => {
      expect(() => validatePath('/home/user/project/../../../etc/passwd', allowedDirs)).toThrow();
    });
  });

  describe('rejects absolute paths outside allowed directories', () => {
    it('should reject /etc/passwd', () => {
      expect(() => validatePath('/etc/passwd', allowedDirs)).toThrow(/outside allowed/i);
    });

    it('should reject /root', () => {
      expect(() => validatePath('/root', allowedDirs)).toThrow(/outside allowed/i);
    });
  });

  describe('allows valid paths', () => {
    it('should return resolved absolute path for allowed directory', () => {
      // Note: this will resolve relative to process.cwd() in test
      const result = validatePath('/home/user/project/file.txt', allowedDirs);
      expect(result).toBe('/home/user/project/file.txt');
    });

    it('should allow paths within allowed directories', () => {
      const result = validatePath('/tmp/app/data.json', allowedDirs);
      expect(result).toBe('/tmp/app/data.json');
    });

    it('should allow subdirectories within allowed directories', () => {
      const result = validatePath('/home/user/project/src/lib/file.ts', allowedDirs);
      expect(result).toBe('/home/user/project/src/lib/file.ts');
    });
  });

  describe('handles relative paths', () => {
    it('should reject relative paths with traversal', () => {
      expect(() => validatePath('../secrets', allowedDirs)).toThrow();
    });
  });
});

describe('validateCommand', () => {
  const allowedCommands = ['ls', 'cat', 'grep', 'find'] as const;

  it('should return true for allowed commands', () => {
    expect(validateCommand('ls', allowedCommands)).toBe(true);
    expect(validateCommand('cat', allowedCommands)).toBe(true);
    expect(validateCommand('grep', allowedCommands)).toBe(true);
    expect(validateCommand('find', allowedCommands)).toBe(true);
  });

  it('should return false for disallowed commands', () => {
    expect(validateCommand('rm', allowedCommands)).toBe(false);
    expect(validateCommand('sudo', allowedCommands)).toBe(false);
    expect(validateCommand('bash', allowedCommands)).toBe(false);
    expect(validateCommand('python', allowedCommands)).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(validateCommand('LS', allowedCommands)).toBe(false);
    expect(validateCommand('Cat', allowedCommands)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(validateCommand('', allowedCommands)).toBe(false);
  });

  it('should return false for commands with path', () => {
    expect(validateCommand('/bin/ls', allowedCommands)).toBe(false);
  });
});

describe('DANGEROUS_PATTERNS', () => {
  it('should be an array of regex patterns', () => {
    expect(Array.isArray(DANGEROUS_PATTERNS)).toBe(true);
    expect(DANGEROUS_PATTERNS.length).toBeGreaterThan(0);
    DANGEROUS_PATTERNS.forEach((pattern) => {
      expect(pattern).toBeInstanceOf(RegExp);
    });
  });

  it('should include patterns for all dangerous constructs', () => {
    const patternStrings = DANGEROUS_PATTERNS.map((p) => p.source);
    // Regex sources: $ is not escaped, special chars are
    expect(patternStrings.some((s) => s.includes('$\\('))).toBe(true); // $(
    expect(patternStrings.some((s) => s.includes('`'))).toBe(true);
    expect(patternStrings.some((s) => s.includes('\\|'))).toBe(true);
    expect(patternStrings.some((s) => s.includes(';'))).toBe(true);
  });
});
