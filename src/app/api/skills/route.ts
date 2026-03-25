import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logAudit, getClientInfo } from '@/lib/audit';
import { logger, generateRequestId } from '@/lib/monitoring';
import { getAllSkills, getSkillsByCategory, getSkill, type DiscoveredSkill } from '@/lib/skills/registry';
import { createSkillExecutor } from '@/lib/skills/executor';
import { createSkillContext, type SkillResult } from '@/lib/skills/types';

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

/**
 * Request body for skill execution
 */
interface SkillExecuteRequest {
  skillId: string;
  input?: unknown;
}

/**
 * Response for skill execution
 */
interface SkillExecuteResponse {
  success: boolean;
  result?: SkillResult;
  error?: string;
}

/**
 * POST /api/skills
 *
 * Execute a skill by ID.
 *
 * Request body:
 * - skillId: string - The ID of the skill to execute
 * - input?: unknown - Optional input data for the skill
 *
 * Authentication required.
 */
export async function POST(request: NextRequest): Promise<NextResponse<SkillExecuteResponse>> {
  const requestId = generateRequestId();
  const session = await auth();

  // Authentication check
  if (!session?.user?.id) {
    logger.securityEvent('Unauthenticated skill execution', undefined);
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  logger.apiRequest(requestId, 'POST', '/api/skills', userId);

  try {
    // Parse request body
    const body: SkillExecuteRequest = await request.json();
    const { skillId, input } = body;

    // Validate required fields
    if (!skillId) {
      return NextResponse.json(
        { success: false, error: 'skillId is required' },
        { status: 400 }
      );
    }

    // Get the skill from registry
    const skill = getSkill(skillId);
    if (!skill) {
      return NextResponse.json(
        { success: false, error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Create execution context
    const context = createSkillContext(userId, userId);

    // Create executor and execute the skill
    const executor = createSkillExecutor(getAllSkills());
    const result = await executor.execute(skillId, input ?? {}, context);

    // Log audit for skill execution
    await logAudit({
      userId,
      action: 'skill_execute',
      resource: 'skill',
      resourceId: skillId,
      metadata: {
        skillName: skill.metadata.name,
        success: result.success,
        error: result.error,
      },
      ...getClientInfo(request),
    });

    logger.apiResponse(requestId, 'POST', '/api/skills', 200, 0);

    return NextResponse.json({ success: result.success, result });
  } catch (error) {
    logger.error(
      'api',
      'Error executing skill',
      error instanceof Error ? error : undefined,
      { requestId, userId }
    );

    return NextResponse.json(
      { success: false, error: 'Failed to execute skill' },
      { status: 500 }
    );
  }
}
