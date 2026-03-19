/**
 * Tests for conditions.ts — Automation Condition Evaluator
 */

import { describe, it, expect } from 'bun:test';
import { evaluateConditions } from './conditions.ts';
import { matcherMatches, matcherMatchesSdk } from './utils.ts';
import type { AutomationCondition } from './types.ts';
import type { ConditionContext } from './conditions.ts';

function ctx(payload: Record<string, unknown>, overrides?: Partial<ConditionContext>): ConditionContext {
  return { payload, ...overrides };
}

function friday(hours: number, minutes: number): Date {
  return new Date(2026, 2, 13, hours, minutes, 0, 0);
}

function monday(hours: number, minutes: number): Date {
  return new Date(2026, 2, 9, hours, minutes, 0, 0);
}

describe('evaluateConditions', () => {
  it('should return true for empty conditions array', () => {
    expect(evaluateConditions([], ctx({}))).toBe(true);
  });

  describe('time condition', () => {
    it('should pass when current time is within range', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'time', after: '09:00', before: '17:00' },
      ];
      expect(evaluateConditions(conditions, ctx({}, { now: friday(12, 0) }))).toBe(true);
    });

    it('should fail when current time is outside range', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'time', after: '09:00', before: '17:00' },
      ];
      expect(evaluateConditions(conditions, ctx({}, { now: friday(20, 0) }))).toBe(false);
    });

    it('should handle overnight wrap (after > before)', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'time', after: '22:00', before: '06:00' },
      ];
      expect(evaluateConditions(conditions, ctx({}, { now: friday(23, 0) }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({}, { now: friday(3, 0) }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({}, { now: friday(12, 0) }))).toBe(false);
    });

    it('should filter by weekday', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'time', weekday: ['mon', 'tue', 'wed'] },
      ];
      expect(evaluateConditions(conditions, ctx({}, { now: monday(12, 0) }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({}, { now: friday(12, 0) }))).toBe(false);
    });

    it('should pass with only after', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'time', after: '14:00' },
      ];
      expect(evaluateConditions(conditions, ctx({}, { now: friday(15, 0) }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({}, { now: friday(13, 0) }))).toBe(false);
    });

    it('should pass with only before', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'time', before: '14:00' },
      ];
      expect(evaluateConditions(conditions, ctx({}, { now: friday(13, 0) }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({}, { now: friday(15, 0) }))).toBe(false);
    });

    it('should respect timezone', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'time', after: '09:00', before: '17:00', timezone: 'UTC' },
      ];
      const utcNoon = new Date('2026-03-13T12:00:00Z');
      expect(evaluateConditions(conditions, ctx({}, { now: utcNoon }))).toBe(true);
    });
  });

  describe('state condition', () => {
    it('should match exact value', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'state', field: 'isFlagged', value: true },
      ];
      expect(evaluateConditions(conditions, ctx({ isFlagged: true }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({ isFlagged: false }))).toBe(false);
    });

    it('should match permissionMode from/to transitions', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'state', field: 'permissionMode', from: 'safe', to: 'allow-all' },
      ];
      expect(evaluateConditions(conditions, ctx({ newMode: 'allow-all', oldMode: 'safe' }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({ newMode: 'allow-all', oldMode: 'ask' }))).toBe(false);
    });

    it('should match contains for arrays', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'state', field: 'labels', contains: 'urgent' },
      ];
      expect(evaluateConditions(conditions, ctx({ labels: ['urgent', 'bug'] }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({ labels: ['low', 'bug'] }))).toBe(false);
    });

    it('should match not_value', () => {
      const conditions: AutomationCondition[] = [
        { condition: 'state', field: 'newMode', not_value: 'allow-all' },
      ];
      expect(evaluateConditions(conditions, ctx({ newMode: 'safe' }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({ newMode: 'allow-all' }))).toBe(false);
    });
  });

  describe('logical conditions', () => {
    it('should evaluate and/or/not composition', () => {
      const conditions: AutomationCondition[] = [{
        condition: 'and',
        conditions: [
          { condition: 'state', field: 'isFlagged', value: true },
          {
            condition: 'or',
            conditions: [
              { condition: 'state', field: 'labels', contains: 'urgent' },
              { condition: 'not', conditions: [{ condition: 'state', field: 'sessionStatus', value: 'done' }] },
            ],
          },
        ],
      }];

      expect(evaluateConditions(conditions, ctx({ isFlagged: true, labels: ['urgent'], sessionStatus: 'todo' }))).toBe(true);
      expect(evaluateConditions(conditions, ctx({ isFlagged: false, labels: ['urgent'], sessionStatus: 'todo' }))).toBe(false);
    });
  });
});

describe('matcherMatches / matcherMatchesSdk', () => {
  it('applies conditions after regex match for app events', () => {
    const matcher = {
      matcher: 'allow-all',
      conditions: [{ condition: 'state', field: 'labels', contains: 'urgent' }] as AutomationCondition[],
      actions: [{ type: 'prompt', prompt: 'x' }] as const,
    };

    expect(matcherMatches(matcher, 'PermissionModeChange', {
      newMode: 'allow-all',
      labels: ['urgent'],
    })).toBe(true);

    expect(matcherMatches(matcher, 'PermissionModeChange', {
      newMode: 'allow-all',
      labels: ['low'],
    })).toBe(false);
  });

  it('applies conditions for SDK events', () => {
    const matcher = {
      matcher: 'Bash',
      conditions: [{ condition: 'state', field: 'tool_input.command', value: 'pwd' }] as AutomationCondition[],
      actions: [{ type: 'prompt', prompt: 'x' }] as const,
    };

    expect(matcherMatchesSdk(matcher, 'PreToolUse', {
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'pwd' },
    })).toBe(false);
  });
});
