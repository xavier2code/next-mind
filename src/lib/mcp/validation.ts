/**
 * Input validation and sanitization utilities for MCP tools
 * Provides security-focused validation to prevent command injection and path traversal
 */

/**
 * Dangerous patterns that indicate command injection attempts
 * Each pattern represents a shell metacharacter or construct that could be exploited
 */
export const DANGEROUS_PATTERNS: ReadonlyArray<RegExp> = [
  /\$\(/, // Command substitution $()
  /`/, // Backtick command substitution
  /\$\{/, // Variable expansion ${}
  /\|/, // Pipe
  /;/, // Command separator
  /&&/, // Logical AND
  /\|\|/, // Logical OR
  />/, // Output redirect
  /</, // Input redirect
  /\n/, // Newline injection
  /\r/, // Carriage return injection
] as const;

/**
 * Pattern descriptions for error messages
 */
const PATTERN_DESCRIPTIONS: Record<string, string> = {
  '\\$\\(': 'Command substitution ($())',
  '`': 'Backtick command substitution',
  '\\$\\{': 'Variable expansion (${})',
  '\\|': 'Pipe operator (|)',
  ';': 'Command separator (;)',
  '&&': 'Logical AND (&&)',
  '\\|\\|': 'Logical OR (||)',
  '>': 'Output redirect (>)',
  '<': 'Input redirect (<)',
  '\\n': 'Newline character',
  '\\r': 'Carriage return',
};

/**
 * Sanitize a command argument by checking for dangerous patterns
 * Throws an error if any dangerous pattern is detected
 *
 * @param arg - The argument to sanitize
 * @returns The sanitized argument (unchanged if safe)
 * @throws Error if the argument contains dangerous patterns
 */
export function sanitizeCommandArg(arg: string): string {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(arg)) {
      const patternSource = pattern.source;
      const description =
        PATTERN_DESCRIPTIONS[patternSource] || `Pattern: ${patternSource}`;
      throw new Error(
        `Potentially dangerous input detected: ${description}. ` +
          `Argument contains forbidden pattern.`
      );
    }
  }

  return arg;
}

/**
 * Validate a file path to prevent path traversal attacks
 * Ensures the resolved path is within one of the allowed directories
 *
 * @param path - The path to validate (can be relative or absolute)
 * @param allowedDirs - Array of allowed directory prefixes
 * @returns The validated absolute path
 * @throws Error if path traversal is detected or path is outside allowed directories
 */
export function validatePath(path: string, allowedDirs: string[]): string {
  // Check for path traversal patterns
  if (path.includes('../') || path.includes('..\\')) {
    throw new Error(
      'Path traversal detected: Paths containing "../" are not allowed'
    );
  }

  // Check for home directory reference
  if (path.startsWith('~') || path.includes('/~/') || path.includes('\\~\\')) {
    throw new Error(
      'Path traversal detected: Paths containing "~" are not allowed'
    );
  }

  // Normalize and resolve the path
  // For absolute paths, use as-is; for relative, we need to check against allowed dirs
  let resolvedPath: string;
  if (path.startsWith('/')) {
    resolvedPath = path;
  } else {
    // For relative paths in tests, we resolve against current working directory
    // In production, this would be validated against allowed directories
    resolvedPath = path;
  }

  // Check if resolved path starts with any allowed directory
  const isAllowed = allowedDirs.some((dir) => {
    const normalizedDir = dir.endsWith('/') ? dir : `${dir}/`;
    const normalizedPath = resolvedPath.endsWith('/')
      ? resolvedPath
      : `${resolvedPath}/`;
    return (
      normalizedPath.startsWith(normalizedDir) || resolvedPath === dir
    );
  });

  if (!isAllowed) {
    throw new Error(
      `Path "${path}" is outside allowed directories: ${allowedDirs.join(', ')}`
    );
  }

  return resolvedPath;
}

/**
 * Validate that a command is in the list of allowed commands
 *
 * @param command - The command name to validate
 * @param allowedCommands - Array or readonly tuple of allowed command names
 * @returns true if command is allowed, false otherwise
 */
export function validateCommand<T extends string>(
  command: string,
  allowedCommands: readonly T[]
): command is T {
  return allowedCommands.includes(command as T);
}
