/**
 * MCP Prompt Manager
 * Handles registration and rendering of MCP prompt templates
 */

/**
 * Argument definition for a prompt
 */
export interface McpPromptArgument {
  /** Name of the argument */
  name: string;
  /** Human-readable description of the argument */
  description: string;
  /** Whether the argument is required */
  required: boolean;
}

/**
 * Message in a rendered prompt
 */
export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

/**
 * Result of rendering a prompt
 */
export interface McpPromptRenderResult {
  description?: string;
  messages: McpPromptMessage[];
}

/**
 * Represents an MCP prompt template
 */
export interface McpPrompt {
  /** Unique name for the prompt */
  name: string;
  /** Human-readable description */
  description: string;
  /** Arguments the prompt accepts */
  arguments: McpPromptArgument[];
  /** Render the prompt with the given arguments */
  render(args: Record<string, string>): Promise<McpPromptRenderResult>;
}

/**
 * Options for creating a PromptManager
 */
export interface CreatePromptManagerOptions {
  /** Whether to include built-in prompts */
  includeBuiltins?: boolean;
}

/**
 * PromptManager class
 * Manages registration, discovery, and rendering of MCP prompts
 */
export class PromptManager {
  private prompts: Map<string, McpPrompt> = new Map();

  constructor(options?: CreatePromptManagerOptions) {
    if (options?.includeBuiltins) {
      this.registerBuiltinPrompts();
    }
  }

  /**
   * Register a prompt with the manager
   * @throws Error if prompt name is duplicate
   */
  registerPrompt(prompt: McpPrompt): void {
    if (this.prompts.has(prompt.name)) {
      throw new Error(`Prompt with name "${prompt.name}" is already registered`);
    }
    this.prompts.set(prompt.name, prompt);
  }

  /**
   * List all registered prompts
   * @returns Array of prompt metadata
   */
  listPrompts(): Array<{
    name: string;
    description: string;
    arguments: McpPromptArgument[];
  }> {
    const result: Array<{
      name: string;
      description: string;
      arguments: McpPromptArgument[];
    }> = [];

    for (const [, prompt] of this.prompts) {
      result.push({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      });
    }

    return result;
  }

  /**
   * Get and render a prompt with the given arguments
   * @returns Rendered prompt content
   * @throws Error if prompt not found or required arguments missing
   */
  async getPrompt(
    name: string,
    args: Record<string, string>
  ): Promise<McpPromptRenderResult> {
    const prompt = this.prompts.get(name);

    if (!prompt) {
      throw new Error(`Prompt with name "${name}" not found`);
    }

    // Validate required arguments
    for (const arg of prompt.arguments) {
      if (arg.required && !(arg.name in args)) {
        throw new Error(`Missing required argument: ${arg.name}`);
      }
    }

    // Render and return the prompt
    return prompt.render(args);
  }

  /**
   * Register built-in prompts
   */
  private registerBuiltinPrompts(): void {
    // analyze-data prompt
    this.registerPrompt({
      name: 'analyze-data',
      description: 'Prompt for data analysis tasks',
      arguments: [
        { name: 'dataType', description: 'Type of data to analyze', required: true },
        { name: 'goal', description: 'Analysis goal or objective', required: true },
      ],
      render: async (args) => ({
        description: `Analyze ${args.dataType}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please analyze the following ${args.dataType} with the goal of ${args.goal}. Provide insights, patterns, and recommendations based on your analysis.`,
            },
          },
        ],
      }),
    });

    // summarize prompt
    this.registerPrompt({
      name: 'summarize',
      description: 'Prompt for summarization tasks',
      arguments: [
        { name: 'content', description: 'Content to summarize', required: true },
        { name: 'format', description: 'Output format (paragraph, bullets, executive)', required: false },
      ],
      render: async (args) => {
        const format = args.format ?? 'paragraph';
        const formatInstruction = format === 'bullets'
          ? 'Use bullet points for the summary.'
          : format === 'executive'
            ? 'Provide an executive summary format with key takeaways first.'
            : 'Summarize in a clear paragraph.';

        return {
          description: `Summarize content in ${format} format`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please summarize the following content.\n\n${formatInstruction}\n\nContent:\n${args.content}`,
              },
            },
          ],
        };
      },
    });

    // code-review prompt
    this.registerPrompt({
      name: 'code-review',
      description: 'Prompt for code review',
      arguments: [
        { name: 'language', description: 'Programming language', required: true },
        { name: 'code', description: 'Code to review', required: true },
      ],
      render: async (args) => ({
        description: `Review ${args.language} code`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please review the following ${args.language} code. Look for:\n- Bugs or errors\n- Performance issues\n- Security concerns\n- Code style and best practices\n- Suggestions for improvement\n\nCode:\n\`\`\`${args.language}\n${args.code}\n\`\`\``,
            },
          },
        ],
      }),
    });
  }
}

/**
 * Create a new PromptManager instance
 * @param options - Configuration options
 */
export function createPromptManager(options?: CreatePromptManagerOptions): PromptManager {
  return new PromptManager(options);
}

/**
 * Global singleton prompt manager for built-in prompts
 * Session-scoped managers should use createPromptManager()
 */
export const promptManager = createPromptManager({ includeBuiltins: true });
