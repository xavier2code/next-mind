import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as skillsGET } from '@/app/api/skills/route';
import { GET as approvalGET, POST as approvalPOST } from '@/app/api/approval/route';
import { clearRegistry, resetInitialized } from '@/lib/skills/registry';
import { initializeSkillRegistry } from '@/lib/skills/registry';
import { approvalState } from '@/lib/approval/state';

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/auth';

describe('Skills and Approval API Endpoints', () => {
  beforeEach(() => {
    clearRegistry();
    resetInitialized();
    // Reset auth mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearRegistry();
    resetInitialized();
  });

  describe('Test 1: GET /api/skills returns list of discovered skills', () => {
    it('should return skills array when authenticated', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      initializeSkillRegistry();

      const request = new NextRequest('http://localhost:3000/api/skills');
      const response = await skillsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skills).toBeDefined();
      expect(Array.isArray(data.skills)).toBe(true);
      expect(data.skills.length).toBeGreaterThan(0);
    });

    it('should return skills with correct metadata fields', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      initializeSkillRegistry();

      const request = new NextRequest('http://localhost:3000/api/skills');
      const response = await skillsGET(request);
      const data = await response.json();

      const skill = data.skills[0];
      expect(skill).toHaveProperty('id');
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('description');
      expect(skill).toHaveProperty('category');
      expect(skill).toHaveProperty('requiresApproval');
      // Should NOT have execute function (security)
      expect(skill).not.toHaveProperty('execute');
    });
  });

  describe('Test 2: GET /api/skills?category=file filters by category', () => {
    it('should filter skills by category', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      initializeSkillRegistry();

      const request = new NextRequest('http://localhost:3000/api/skills?category=file');
      const response = await skillsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skills).toBeDefined();

      // All returned skills should be in 'file' category
      data.skills.forEach((skill: { category: string }) => {
        expect(skill.category).toBe('file');
      });
    });

    it('should return empty array for category with no skills', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      initializeSkillRegistry();

      const request = new NextRequest('http://localhost:3000/api/skills?category=custom');
      const response = await skillsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skills).toBeDefined();
      expect(Array.isArray(data.skills)).toBe(true);
    });
  });

  describe('Test 5: Unauthenticated requests return 401', () => {
    it('should return 401 for skills endpoint when not authenticated', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/skills');
      const response = await skillsGET(request);

      expect(response.status).toBe(401);
    });

    it('should return 401 for approval GET endpoint when not authenticated', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/approval');
      const response = await approvalGET(request);

      expect(response.status).toBe(401);
    });

    it('should return 401 for approval POST endpoint when not authenticated', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/approval', {
        method: 'POST',
        body: JSON.stringify({ requestId: 'test', approved: true }),
      });
      const response = await approvalPOST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Test 3: POST /api/approval with approve decision updates state', () => {
    it('should approve a pending request', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      // Create a pending request
      const approvalRequest = approvalState.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const request = new NextRequest('http://localhost:3000/api/approval', {
        method: 'POST',
        body: JSON.stringify({
          requestId: approvalRequest.id,
          approved: true,
        }),
      });

      const response = await approvalPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.request.status).toBe('approved');
    });
  });

  describe('Test 4: POST /api/approval with reject decision updates state', () => {
    it('should reject a pending request', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      // Create a pending request
      const approvalRequest = approvalState.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const request = new NextRequest('http://localhost:3000/api/approval', {
        method: 'POST',
        body: JSON.stringify({
          requestId: approvalRequest.id,
          approved: false,
          reason: 'User cancelled',
        }),
      });

      const response = await approvalPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.request.status).toBe('rejected');
    });
  });

  describe('Test 6: Invalid approval ID returns 404', () => {
    it('should return error for non-existent approval ID', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/approval', {
        method: 'POST',
        body: JSON.stringify({
          requestId: 'non-existent-id',
          approved: true,
        }),
      });

      const response = await approvalPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/approval returns pending approvals', () => {
    it('should return pending approvals for the current user', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      // Create pending requests
      approvalState.createRequest({
        skillId: 'skill-1',
        skillName: 'Skill 1',
        action: 'Action 1',
        details: 'Details 1',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      approvalState.createRequest({
        skillId: 'skill-2',
        skillName: 'Skill 2',
        action: 'Action 2',
        details: 'Details 2',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const request = new NextRequest('http://localhost:3000/api/approval');
      const response = await approvalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.approvals).toBeDefined();
      expect(data.approvals.length).toBe(2);
    });

    it('should not return approvals from other users', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-2', email: 'user2@example.com' },
      });

      // Create request for user-1
      approvalState.createRequest({
        skillId: 'skill-1',
        skillName: 'Skill 1',
        action: 'Action 1',
        details: 'Details 1',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const request = new NextRequest('http://localhost:3000/api/approval');
      const response = await approvalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.approvals).toBeDefined();
      expect(data.approvals.length).toBe(0);
    });
  });

  describe('Approval ownership validation', () => {
    it('should reject approval for another user request', async () => {
      (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-2', email: 'user2@example.com' },
      });

      // Create request for user-1
      const approvalRequest = approvalState.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const request = new NextRequest('http://localhost:3000/api/approval', {
        method: 'POST',
        body: JSON.stringify({
          requestId: approvalRequest.id,
          approved: true,
        }),
      });

      const response = await approvalPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not authorized');
    });
  });
});

// Import vi for mocking
import { vi } from 'vitest';
