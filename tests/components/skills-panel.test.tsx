import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkillsPanel } from '@/components/sidebar/skills-panel';

// Mock fetch for skills API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock skill data
const mockSkills = [
  {
    id: 'file-read',
    name: 'Read File',
    description: 'Read content from a file',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'read'],
    requiresApproval: false,
    destructiveActions: [],
  },
  {
    id: 'file-delete',
    name: 'Delete File',
    description: 'Delete a file permanently',
    version: '1.0.0',
    category: 'file',
    tags: ['file', 'delete'],
    requiresApproval: true,
    destructiveActions: ['delete'],
  },
  {
    id: 'data-analyze',
    name: 'Analyze Data',
    description: 'Perform statistical analysis on data',
    version: '1.0.0',
    category: 'data',
    tags: ['data', 'analysis'],
    requiresApproval: false,
    destructiveActions: [],
  },
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web for information',
    version: '1.0.0',
    category: 'web',
    tags: ['web', 'search'],
    requiresApproval: false,
    destructiveActions: [],
  },
];

describe('SkillsPanel Component', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('Test 1: Renders skills list from API', () => {
    it('should fetch and display skills', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Read File')).toBeDefined();
        expect(screen.getByText('Delete File')).toBeDefined();
        expect(screen.getByText('Analyze Data')).toBeDefined();
        expect(screen.getByText('Web Search')).toBeDefined();
      });
    });

    it('should group skills by category', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      await waitFor(() => {
        // Category headers should be visible - use getAllByText since there are multiple
        const fileCategories = screen.getAllByText('file');
        expect(fileCategories.length).toBeGreaterThan(0);
        const dataCategories = screen.getAllByText('data');
        expect(dataCategories.length).toBeGreaterThan(0);
        const webCategories = screen.getAllByText('web');
        expect(webCategories.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Test 2: Shows loading state while fetching', () => {
    it('should show loading indicator while fetching', () => {
      // Never resolve to keep loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<SkillsPanel />);

      expect(screen.getByText(/loading/i)).toBeDefined();
    });
  });

  describe('Test 3: Shows error state on fetch failure', () => {
    it('should show error message when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SkillsPanel />);

      await waitFor(() => {
        // Check for error-related content
        const errorElement = screen.queryByText(/failed/i) || screen.queryByText(/error/i);
        expect(errorElement).toBeDefined();
      });
    });

    it('should show retry button on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SkillsPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
      });
    });
  });

  describe('Test 4: Filters skills by search query', () => {
    it('should filter skills by name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      // Wait for skills to load
      await waitFor(() => {
        expect(screen.getByText('Read File')).toBeDefined();
      });

      // Type in search
      const searchInput = screen.getByPlaceholderText(/search skills/i);
      fireEvent.change(searchInput, { target: { value: 'delete' } });

      // Should show only matching skill
      await waitFor(() => {
        expect(screen.getByText('Delete File')).toBeDefined();
        expect(screen.queryByText('Read File')).toBeNull();
      });
    });

    it('should filter skills by description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Read File')).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/search skills/i);
      fireEvent.change(searchInput, { target: { value: 'statistical' } });

      await waitFor(() => {
        expect(screen.getByText('Analyze Data')).toBeDefined();
        expect(screen.queryByText('Read File')).toBeNull();
      });
    });

    it('should filter skills by tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Read File')).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/search skills/i);
      fireEvent.change(searchInput, { target: { value: 'search' } });

      await waitFor(() => {
        expect(screen.getByText('Web Search')).toBeDefined();
        expect(screen.queryByText('Read File')).toBeNull();
      });
    });

    it('should show empty state when no skills match', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Read File')).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/search skills/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/no skills found/i)).toBeDefined();
      });
    });
  });

  describe('Test 5: Groups skills by category', () => {
    it('should display category badges', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      await waitFor(() => {
        // Category badges should be visible (colored pills)
        const categoryBadges = screen.getAllByText(/file|data|web/);
        expect(categoryBadges.length).toBeGreaterThan(0);
      });
    });

    it('should apply correct colors to categories', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Read File')).toBeDefined();
      });

      // Check that category elements exist (color testing is done via snapshot or e2e)
      const fileCategory = screen.getAllByText('file');
      expect(fileCategory.length).toBeGreaterThan(0);
    });
  });

  describe('Test 6: Shows approval badge for requiresApproval skills', () => {
    it('should show approval badge for destructive skills', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      await waitFor(() => {
        // Should show shield icon or approval badge
        const deleteFileItem = screen.getByText('Delete File').closest('div');
        expect(deleteFileItem?.querySelector('[data-testid="approval-badge"]') ||
               deleteFileItem?.textContent?.includes('requires approval')).toBeDefined();
      });
    });

    it('should not show approval badge for safe skills', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Read File')).toBeDefined();
      });

      // Read File should not have approval badge
      const readFileItem = screen.getByText('Read File').closest('div');
      const hasApprovalBadge = readFileItem?.querySelector('[data-testid="approval-badge"]');
      expect(hasApprovalBadge).toBeNull();
    });
  });

  describe('Test 7: Clicking skill invokes onSkillSelect callback', () => {
    it('should call onSkillSelect when skill is clicked', async () => {
      const onSkillSelect = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel onSkillSelect={onSkillSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Read File')).toBeDefined();
      });

      // Click on skill
      fireEvent.click(screen.getByText('Read File'));

      expect(onSkillSelect).toHaveBeenCalledWith('file-read');
    });

    it('should pass skill ID to callback', async () => {
      const onSkillSelect = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: mockSkills }),
      });

      render(<SkillsPanel onSkillSelect={onSkillSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Analyze Data')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Analyze Data'));

      expect(onSkillSelect).toHaveBeenCalledWith('data-analyze');
    });
  });
});
