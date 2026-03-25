import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger, generateRequestId } from '@/lib/monitoring';
import { getAllSkills, getSkillsByCategory, type DiscoveredSkill } from '@/lib/skills/registry';

/**
 * Skill metadata returned by the API (without execute function for security)
 */
interface SkillApiResponse {
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
 * Convert a DiscoveredSkill to API response format.
 * Strips the execute function for security.
 */
function toApiResponse(skill: DiscoveredSkill): SkillApiResponse {
  return {
    id: skill.metadata.id,
    name: skill.metadata.name,
    description: skill.metadata.description,
    version: skill.metadata.version,
    category: skill.metadata.category,
    tags: skill.metadata.tags,
    requiresApproval: skill.metadata.requiresApproval,
    destructiveActions: skill.metadata.destructiveActions,
  };
}

/**
 * GET /api/skills
 *
 * Returns list of available skills.
 * Supports optional ?category=X query parameter to filter by category.
 *
 * Authentication required.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const session = await auth();

  // Authentication check
  if (!session?.user?.id) {
    logger.securityEvent('Unauthenticated skills access', undefined);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  logger.apiRequest(requestId, 'GET', '/api/skills', userId);

  try {
    // Get optional category filter
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Get skills (filtered by category if specified)
    let skills: DiscoveredSkill[];
    if (category) {
      skills = getSkillsByCategory(category as 'file' | 'data' | 'web' | 'system' | 'custom');
    } else {
      skills = getAllSkills();
    }

    // Convert to API response format
    const skillResponses = skills.map(toApiResponse);

    // Log audit for skills list access
    await logAudit({
      userId,
      action: 'skills_list',
      resource: 'skill',
      metadata: {
        category: category || 'all',
        count: skillResponses.length,
      },
      ...getClientInfo(request),
    });

    logger.apiResponse(requestId, 'GET', '/api/skills', 200, 0);

    return NextResponse.json({ skills: skillResponses });
  } catch (error) {
    logger.error(
      'api',
      'Error fetching skills',
      error instanceof Error ? error : undefined,
      { requestId, userId }
    );

    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}
