'use client';

import { useState, useEffect } from 'react';
import { Search, Shield, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Skill data returned from API
 */
interface SkillData {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  requiresApproval: boolean;
  destructiveActions: string[];
}

/**
 * Props for SkillsPanel component
 */
export interface SkillsPanelProps {
  /** Callback when a skill is selected */
  onSkillSelect?: (skillId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for SkillItem component
 */
interface SkillItemProps {
  skill: SkillData;
  onSelect?: (skillId: string) => void;
}

/**
 * Category colors configuration
 */
const CATEGORY_COLORS: Record<string, string> = {
  file: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  data: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  web: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  system: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
};

/**
 * Individual skill item component
 */
function SkillItem({ skill, onSelect }: SkillItemProps) {
  const categoryColor = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.custom;

  return (
    <div
      className="group flex items-start gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
      onClick={() => onSelect?.(skill.id)}
    >
      {/* Skill info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{skill.name}</span>
          {skill.requiresApproval && (
            <span data-testid="approval-badge" className="flex-shrink-0">
              <Shield className="h-3.5 w-3.5 text-amber-500" />
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
          {skill.description}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          {/* Category badge */}
          <span className={cn('text-xs px-1.5 py-0.5 rounded', categoryColor)}>
            {skill.category}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Sidebar panel for skill discovery and browsing.
 *
 * Fetches skills from the API and displays them grouped by category.
 * Supports search filtering by name, description, and tags.
 *
 * @example
 * ```tsx
 * <SkillsPanel onSkillSelect={(id) => console.log('Selected:', id)} />
 * ```
 */
export function SkillsPanel({ onSkillSelect, className }: SkillsPanelProps) {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch skills on mount
  useEffect(() => {
    fetchSkills();
  }, []);

  async function fetchSkills() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/skills');
      if (!response.ok) {
        throw new Error('Failed to load skills');
      }

      const data = await response.json();
      setSkills(data.skills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setIsLoading(false);
    }
  }

  // Filter skills by search query
  const filteredSkills = searchQuery
    ? skills.filter((skill) => {
        const query = searchQuery.toLowerCase();
        return (
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      })
    : skills;

  // Group skills by category
  const groupedSkills = filteredSkills.reduce(
    (groups, skill) => {
      const category = skill.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(skill);
      return groups;
    },
    {} as Record<string, SkillData[]>
  );

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedSkills).sort();

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-semibold text-sm">Skills</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          <span className="ml-2 text-sm text-zinc-500">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-semibold text-sm">Skills</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
          <p className="text-sm text-zinc-500 text-center mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSkills}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
        <h2 className="font-semibold text-sm">Skills</h2>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Skills list */}
      <ScrollArea className="flex-1">
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <p className="text-sm text-zinc-500">
              {searchQuery ? 'No skills found' : 'No skills available'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {sortedCategories.map((category) => (
              <div key={category} className="mb-2">
                {/* Category header */}
                <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {category}
                </div>
                {/* Skills in category */}
                {groupedSkills[category].map((skill) => (
                  <SkillItem
                    key={skill.id}
                    skill={skill}
                    onSelect={onSkillSelect}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

/**
 * Hook for fetching and managing skills data.
 *
 * @returns Object with skills, loading state, error, and refetch function
 */
export function useSkills() {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/skills');
      if (!response.ok) {
        throw new Error('Failed to load skills');
      }

      const data = await response.json();
      setSkills(data.skills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refetch();
  }, []);

  return {
    skills,
    isLoading,
    error,
    refetch,
  };
}
