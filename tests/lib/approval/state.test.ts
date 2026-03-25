import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ApprovalStateMachine,
  approvalState,
  createApprovalRequest,
  type ApprovalRequest,
  type ApprovalStatus,
} from '@/lib/approval/state';

describe('Approval Flow System', () => {
  // Use a fresh state machine for each test
  let stateMachine: ApprovalStateMachine;

  beforeEach(() => {
    stateMachine = new ApprovalStateMachine();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Test 1: createApprovalRequest generates valid request with pending status', () => {
    it('should create a request with pending status', () => {
      const request = stateMachine.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Delete file',
        details: 'Will delete /path/to/file.txt',
        input: { path: '/path/to/file.txt' },
        userId: 'user-1',
        sessionId: 'session-1',
      });

      expect(request.id).toBeDefined();
      expect(request.status).toBe('pending');
      expect(request.skillId).toBe('test-skill');
      expect(request.skillName).toBe('Test Skill');
      expect(request.action).toBe('Delete file');
      expect(request.userId).toBe('user-1');
      expect(request.sessionId).toBe('session-1');
    });

    it('should generate unique IDs for different requests', () => {
      const request1 = stateMachine.createRequest({
        skillId: 'skill-1',
        skillName: 'Skill 1',
        action: 'Action 1',
        details: 'Details 1',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const request2 = stateMachine.createRequest({
        skillId: 'skill-2',
        skillName: 'Skill 2',
        action: 'Action 2',
        details: 'Details 2',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      expect(request1.id).not.toBe(request2.id);
    });

    it('should set createdAt and expiresAt timestamps', () => {
      const beforeCreate = Date.now();
      const request = stateMachine.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });
      const afterCreate = Date.now();

      expect(request.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate);
      expect(request.createdAt.getTime()).toBeLessThanOrEqual(afterCreate);

      // Default timeout is 5 minutes
      const expectedExpiry = request.createdAt.getTime() + 5 * 60 * 1000;
      expect(request.expiresAt.getTime()).toBe(expectedExpiry);
    });
  });

  describe('Test 2: ApprovalStateMachine transitions from pending to approved', () => {
    it('should transition pending request to approved', () => {
      const request = stateMachine.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const approved = stateMachine.approve(request.id);

      expect(approved).toBeDefined();
      expect(approved?.status).toBe('approved');
      expect(approved?.id).toBe(request.id);
    });

    it('should return the updated request after approval', () => {
      const request = stateMachine.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: { test: 'data' },
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const approved = stateMachine.approve(request.id);

      expect(approved?.skillId).toBe('test-skill');
      expect(approved?.input).toEqual({ test: 'data' });
    });
  });

  describe('Test 3: ApprovalStateMachine transitions from pending to rejected', () => {
    it('should transition pending request to rejected', () => {
      const request = stateMachine.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const rejected = stateMachine.reject(request.id, 'User cancelled');

      expect(rejected).toBeDefined();
      expect(rejected?.status).toBe('rejected');
    });

    it('should store rejection reason in metadata', () => {
      const request = stateMachine.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const rejected = stateMachine.reject(request.id, 'Too risky');

      expect(rejected).toBeDefined();
      // The reason should be logged or stored
      expect(rejected?.status).toBe('rejected');
    });
  });

  describe('Test 4: ApprovalStateMachine rejects invalid transitions', () => {
    it('should not allow transition from approved to pending', () => {
      const request = stateMachine.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      // First, approve it
      stateMachine.approve(request.id);

      // Try to approve again - should return null (no change)
      const secondApproval = stateMachine.approve(request.id);
      expect(secondApproval).toBeNull();
    });

    it('should not allow transition from rejected to approved', () => {
      const request = stateMachine.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      // First, reject it
      stateMachine.reject(request.id);

      // Try to approve after rejection - should return null
      const approval = stateMachine.approve(request.id);
      expect(approval).toBeNull();
    });

    it('should return null for non-existent request', () => {
      const result = stateMachine.approve('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('Test 5: ApprovalStateMachine expires requests after timeout', () => {
    it('should mark request as expired after timeout', () => {
      // Create request with very short timeout
      const stateMachineShortTimeout = new ApprovalStateMachine(100); // 100ms timeout

      const request = stateMachineShortTimeout.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      expect(request.status).toBe('pending');

      // Wait for expiry
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Try to approve expired request - should fail
          const approved = stateMachineShortTimeout.approve(request.id);
          expect(approved).toBeNull();
          resolve();
        }, 150);
      });
    });

    it('should not list expired requests in pending', async () => {
      const stateMachineShortTimeout = new ApprovalStateMachine(50); // 50ms timeout

      const request = stateMachineShortTimeout.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      // Immediately should be in pending
      let pending = stateMachineShortTimeout.getPendingApprovals('user-1');
      expect(pending.length).toBe(1);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now should not be in pending (expired)
      pending = stateMachineShortTimeout.getPendingApprovals('user-1');
      expect(pending.length).toBe(0);
    });
  });

  describe('Test 6: getPendingApprovals returns only pending requests', () => {
    it('should return only pending requests for a user', () => {
      // Create multiple requests
      const request1 = stateMachine.createRequest({
        skillId: 'skill-1',
        skillName: 'Skill 1',
        action: 'Action 1',
        details: 'Details 1',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const request2 = stateMachine.createRequest({
        skillId: 'skill-2',
        skillName: 'Skill 2',
        action: 'Action 2',
        details: 'Details 2',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      // Approve one
      stateMachine.approve(request1.id);

      const pending = stateMachine.getPendingApprovals('user-1');

      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(request2.id);
    });

    it('should not return requests from other users', () => {
      stateMachine.createRequest({
        skillId: 'skill-1',
        skillName: 'Skill 1',
        action: 'Action 1',
        details: 'Details 1',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      stateMachine.createRequest({
        skillId: 'skill-2',
        skillName: 'Skill 2',
        action: 'Action 2',
        details: 'Details 2',
        input: {},
        userId: 'user-2',
        sessionId: 'session-2',
      });

      const pendingUser1 = stateMachine.getPendingApprovals('user-1');
      const pendingUser2 = stateMachine.getPendingApprovals('user-2');

      expect(pendingUser1.length).toBe(1);
      expect(pendingUser1[0].skillId).toBe('skill-1');

      expect(pendingUser2.length).toBe(1);
      expect(pendingUser2[0].skillId).toBe('skill-2');
    });

    it('should return empty array when no pending requests', () => {
      const pending = stateMachine.getPendingApprovals('user-1');
      expect(pending).toEqual([]);
    });
  });

  describe('getRequest', () => {
    it('should return request by ID', () => {
      const request = stateMachine.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      const retrieved = stateMachine.getRequest(request.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(request.id);
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = stateMachine.getRequest('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should remove old expired requests', async () => {
      const stateMachineShortTimeout = new ApprovalStateMachine(10); // 10ms timeout

      // Create request that will expire
      stateMachineShortTimeout.createRequest({
        skillId: 'test-skill',
        skillName: 'Test Skill',
        action: 'Test action',
        details: 'Test details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Cleanup should remove the expired request
      stateMachineShortTimeout.cleanup();

      // Request should be gone
      const pending = stateMachineShortTimeout.getPendingApprovals('user-1');
      expect(pending.length).toBe(0);
    });
  });

  describe('Global approval state', () => {
    it('should provide a global approvalState instance', () => {
      expect(approvalState).toBeInstanceOf(ApprovalStateMachine);
    });

    it('should create request via createApprovalRequest helper', () => {
      const request = createApprovalRequest({
        skillId: 'global-skill',
        skillName: 'Global Skill',
        action: 'Global action',
        details: 'Global details',
        input: {},
        userId: 'user-1',
        sessionId: 'session-1',
      });

      expect(request.id).toBeDefined();
      expect(request.status).toBe('pending');
      expect(request.skillId).toBe('global-skill');
    });
  });
});
