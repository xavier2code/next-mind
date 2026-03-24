import { describe, it, expect, beforeEach } from 'vitest';
import {
  PromptManager,
  createPromptManager,
  type McpPrompt,
  type McpPromptArgument,
} from '@/lib/mcp/prompts';

describe('PromptManager', () => {
  let manager: PromptManager;

  beforeEach(() => {
    manager = createPromptManager();
  });

  describe('registerPrompt', () => {
    it('should register a prompt to the manager', () => {
      const prompt: McpPrompt = {
        name: 'test-prompt',
        description: 'A test prompt',
        arguments: [],
        render: async () => ({
          messages: [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
        }),
      };

      manager.registerPrompt(prompt);

      const list = manager.listPrompts();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('test-prompt');
    });

    it('should throw error when registering duplicate name', () => {
      const prompt1: McpPrompt = {
        name: 'duplicate-prompt',
        description: 'First prompt',
        arguments: [],
        render: async () => ({
          messages: [{ role: 'user', content: { type: 'text', text: 'First' } }],
        }),
      };

      const prompt2: McpPrompt = {
        name: 'duplicate-prompt',
        description: 'Second prompt',
        arguments: [],
        render: async () => ({
          messages: [{ role: 'user', content: { type: 'text', text: 'Second' } }],
        }),
      };

      manager.registerPrompt(prompt1);
      expect(() => manager.registerPrompt(prompt2)).toThrow(
        'Prompt with name "duplicate-prompt" is already registered'
      );
    });
  });

  describe('listPrompts', () => {
    it('should return all prompts with name, description, arguments', () => {
      const prompt1: McpPrompt = {
        name: 'prompt-1',
        description: 'First prompt',
        arguments: [{ name: 'input', description: 'User input', required: true }],
        render: async () => ({
          messages: [{ role: 'user', content: { type: 'text', text: '' } }],
        }),
      };

      const prompt2: McpPrompt = {
        name: 'prompt-2',
        description: 'Second prompt',
        arguments: [
          { name: 'query', description: 'Search query', required: true },
          { name: 'limit', description: 'Max results', required: false },
        ],
        render: async () => ({
          messages: [{ role: 'user', content: { type: 'text', text: '' } }],
        }),
      };

      manager.registerPrompt(prompt1);
      manager.registerPrompt(prompt2);

      const list = manager.listPrompts();

      expect(list).toHaveLength(2);
      expect(list).toContainEqual({
        name: 'prompt-1',
        description: 'First prompt',
        arguments: [{ name: 'input', description: 'User input', required: true }],
      });
    });

    it('should return empty array when no prompts registered', () => {
      const list = manager.listPrompts();
      expect(list).toEqual([]);
    });
  });

  describe('getPrompt', () => {
    it('should return rendered prompt content with args', async () => {
      const prompt: McpPrompt = {
        name: 'greeting',
        description: 'Greeting prompt',
        arguments: [{ name: 'name', description: 'User name', required: true }],
        render: async (args) => ({
          description: 'A greeting message',
          messages: [
            {
              role: 'user',
              content: { type: 'text', text: `Hello, ${args.name}!` },
            },
          ],
        }),
      };

      manager.registerPrompt(prompt);

      const result = await manager.getPrompt('greeting', { name: 'Alice' });

      expect(result.description).toBe('A greeting message');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual({
        role: 'user',
        content: { type: 'text', text: 'Hello, Alice!' },
      });
    });

    it('should throw error for unknown prompt name', async () => {
      await expect(manager.getPrompt('unknown', {})).rejects.toThrow(
        'Prompt with name "unknown" not found'
      );
    });

    it('should throw error when missing required arguments', async () => {
      const prompt: McpPrompt = {
        name: 'requires-args',
        description: 'Prompt requiring args',
        arguments: [
          { name: 'required1', description: 'First required', required: true },
          { name: 'required2', description: 'Second required', required: true },
        ],
        render: async () => ({
          messages: [{ role: 'user', content: { type: 'text', text: '' } }],
        }),
      };

      manager.registerPrompt(prompt);

      await expect(manager.getPrompt('requires-args', { required1: 'value' })).rejects.toThrow(
        'Missing required argument: required2'
      );
    });
  });

  describe('Prompt Arguments Validation', () => {
    it('should validate required arguments are present', async () => {
      const prompt: McpPrompt = {
        name: 'validate-args',
        description: 'Validation test',
        arguments: [
          { name: 'code', description: 'Code to review', required: true },
          { name: 'language', description: 'Programming language', required: true },
        ],
        render: async (args) => ({
          messages: [
            {
              role: 'user',
              content: { type: 'text', text: `Review this ${args.language} code: ${args.code}` },
            },
          ],
        }),
      };

      manager.registerPrompt(prompt);

      const result = await manager.getPrompt('validate-args', {
        code: 'const x = 1;',
        language: 'JavaScript',
      });

      expect(result.messages[0].content.text).toBe(
        'Review this JavaScript code: const x = 1;'
      );
    });

    it('should allow optional arguments to be omitted', async () => {
      const prompt: McpPrompt = {
        name: 'optional-args',
        description: 'Optional args test',
        arguments: [
          { name: 'required', description: 'Required arg', required: true },
          { name: 'optional', description: 'Optional arg', required: false },
        ],
        render: async (args) => ({
          messages: [
            {
              role: 'user',
              content: { type: 'text', text: `Required: ${args.required}, Optional: ${args.optional ?? 'none'}` },
            },
          ],
        }),
      };

      manager.registerPrompt(prompt);

      const result = await manager.getPrompt('optional-args', { required: 'value' });

      expect(result.messages[0].content.text).toBe('Required: value, Optional: none');
    });
  });

  describe('Template Variable Interpolation', () => {
    it('should support template variables interpolation', async () => {
      const prompt: McpPrompt = {
        name: 'template-test',
        description: 'Template test',
        arguments: [
          { name: 'topic', description: 'Topic to discuss', required: true },
          { name: 'tone', description: 'Tone of response', required: false },
        ],
        render: async (args) => {
          const tone = args.tone ?? 'professional';
          return {
            description: `Discuss ${args.topic} in a ${tone} tone`,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Please provide a ${tone} explanation about ${args.topic}.`,
                },
              },
            ],
          };
        },
      };

      manager.registerPrompt(prompt);

      const result = await manager.getPrompt('template-test', {
        topic: 'machine learning',
        tone: 'friendly',
      });

      expect(result.description).toBe('Discuss machine learning in a friendly tone');
      expect(result.messages[0].content.text).toBe(
        'Please provide a friendly explanation about machine learning.'
      );
    });
  });
});

describe('Built-in Prompts', () => {
  let manager: PromptManager;

  beforeEach(() => {
    // Create manager with built-in prompts
    manager = createPromptManager({ includeBuiltins: true });
  });

  describe('analyze-data prompt', () => {
    it('should have analyze-data prompt with required args', () => {
      const prompts = manager.listPrompts();
      const analyzePrompt = prompts.find((p) => p.name === 'analyze-data');

      expect(analyzePrompt).toBeDefined();
      expect(analyzePrompt?.arguments).toHaveLength(2);
      expect(analyzePrompt?.arguments.map((a) => a.name)).toContain('dataType');
      expect(analyzePrompt?.arguments.map((a) => a.name)).toContain('goal');
    });

    it('should render analyze-data prompt with args', async () => {
      const result = await manager.getPrompt('analyze-data', {
        dataType: 'sales figures',
        goal: 'identify trends',
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('sales figures');
      expect(result.messages[0].content.text).toContain('identify trends');
    });
  });

  describe('summarize prompt', () => {
    it('should have summarize prompt with required and optional args', () => {
      const prompts = manager.listPrompts();
      const summarizePrompt = prompts.find((p) => p.name === 'summarize');

      expect(summarizePrompt).toBeDefined();
      const requiredArgs = summarizePrompt?.arguments.filter((a) => a.required);
      const optionalArgs = summarizePrompt?.arguments.filter((a) => !a.required);

      expect(requiredArgs?.map((a) => a.name)).toContain('content');
      expect(optionalArgs?.map((a) => a.name)).toContain('format');
    });

    it('should render summarize prompt with default format', async () => {
      const result = await manager.getPrompt('summarize', {
        content: 'Long text to summarize...',
      });

      expect(result.messages[0].content.text).toContain('Long text to summarize...');
    });
  });

  describe('code-review prompt', () => {
    it('should have code-review prompt with required args', () => {
      const prompts = manager.listPrompts();
      const codeReviewPrompt = prompts.find((p) => p.name === 'code-review');

      expect(codeReviewPrompt).toBeDefined();
      expect(codeReviewPrompt?.arguments.map((a) => a.name)).toContain('language');
      expect(codeReviewPrompt?.arguments.map((a) => a.name)).toContain('code');
    });

    it('should render code-review prompt with args', async () => {
      const result = await manager.getPrompt('code-review', {
        language: 'TypeScript',
        code: 'const x: number = 1;',
      });

      expect(result.messages[0].content.text).toContain('TypeScript');
      expect(result.messages[0].content.text).toContain('const x: number = 1;');
    });
  });
});
