/**
 * Automation Condition Evaluator
 *
 * Pure synchronous evaluation engine for automation conditions.
 * Inspired by Home Assistant's condition system.
 */

import type { AutomationCondition, LogicalCondition, StateCondition, TimeCondition } from './types.ts';
import { MAX_CONDITION_DEPTH_EXCLUSIVE } from './conditions-constants.ts';

const TRANSITION_FIELDS: Record<string, { to: string; from: string }> = {
  permissionMode: { to: 'newMode', from: 'oldMode' },
  sessionStatus: { to: 'newState', from: 'oldState' },
};

const WEEKDAY_MAP: Record<string, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7,
};

export interface ConditionContext {
  payload: Record<string, unknown>;
  now?: Date;
  matcherTimezone?: string;
}

export function evaluateConditions(conditions: AutomationCondition[], context: ConditionContext): boolean {
  if (conditions.length === 0) return true;
  for (const condition of conditions) {
    if (!evaluateCondition(condition, context, 0)) return false;
  }
  return true;
}

function evaluateCondition(condition: AutomationCondition, context: ConditionContext, depth: number): boolean {
  if (depth >= MAX_CONDITION_DEPTH_EXCLUSIVE) return false;

  switch (condition.condition) {
    case 'time':
      return evaluateTimeCondition(condition, context);
    case 'state':
      return evaluateStateCondition(condition, context);
    case 'and':
    case 'or':
    case 'not':
      return evaluateLogicalCondition(condition, context, depth);
    default:
      return false;
  }
}

function evaluateTimeCondition(condition: TimeCondition, context: ConditionContext): boolean {
  const now = context.now ?? new Date();
  const timezone = condition.timezone ?? context.matcherTimezone;
  const { hours, minutes, weekdayNum } = getTimeInTimezone(now, timezone);

  if (condition.weekday && condition.weekday.length > 0) {
    const allowed = new Set(condition.weekday.map(day => WEEKDAY_MAP[day]));
    if (!allowed.has(weekdayNum)) return false;
  }

  const hasAfter = condition.after !== undefined;
  const hasBefore = condition.before !== undefined;

  if (!hasAfter && !hasBefore) return true;

  const currentMinutes = hours * 60 + minutes;
  const afterMinutes = hasAfter ? parseTimeToMinutes(condition.after!) : 0;
  const beforeMinutes = hasBefore ? parseTimeToMinutes(condition.before!) : 0;

  if (hasAfter && hasBefore) {
    if (afterMinutes <= beforeMinutes) {
      return currentMinutes >= afterMinutes && currentMinutes < beforeMinutes;
    }
    return currentMinutes >= afterMinutes || currentMinutes < beforeMinutes;
  }

  if (hasAfter) return currentMinutes >= afterMinutes;
  return currentMinutes < beforeMinutes;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function getTimeInTimezone(date: Date, timezone?: string): { hours: number; minutes: number; weekdayNum: number } {
  if (timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        weekday: 'short',
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      const hours = Number(parts.find(part => part.type === 'hour')?.value ?? 0);
      const minutes = Number(parts.find(part => part.type === 'minute')?.value ?? 0);
      const weekdayStr = parts.find(part => part.type === 'weekday')?.value?.toLowerCase().slice(0, 3) ?? '';
      const weekdayNum = WEEKDAY_MAP[weekdayStr] ?? 0;
      return { hours, minutes, weekdayNum };
    } catch {
      // Fall back to local time.
    }
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const jsDay = date.getDay();
  const weekdayNum = jsDay === 0 ? 7 : jsDay;
  return { hours, minutes, weekdayNum };
}

function evaluateStateCondition(condition: StateCondition, context: ConditionContext): boolean {
  const { field } = condition;
  const { payload } = context;

  const hasFrom = condition.from !== undefined;
  const hasTo = condition.to !== undefined;

  if (hasFrom || hasTo) {
    const mapping = TRANSITION_FIELDS[field];
    const toKey = mapping?.to ?? field;
    const fromKey = mapping?.from ?? field;

    if (hasTo && payload[toKey] !== condition.to) return false;
    if (hasFrom && payload[fromKey] !== condition.from) return false;
    return true;
  }

  if (condition.contains !== undefined) {
    const arr = payload[field];
    if (!Array.isArray(arr)) return false;
    return arr.includes(condition.contains);
  }

  if (condition.not_value !== undefined) {
    const fieldValue = payload[field];
    if (fieldValue === undefined) return false;
    return fieldValue !== condition.not_value;
  }

  if (condition.value !== undefined) {
    return payload[field] === condition.value;
  }

  return false;
}

function evaluateLogicalCondition(condition: LogicalCondition, context: ConditionContext, depth: number): boolean {
  const { conditions } = condition;

  switch (condition.condition) {
    case 'and':
      for (const subCondition of conditions) {
        if (!evaluateCondition(subCondition, context, depth + 1)) return false;
      }
      return true;
    case 'or':
      for (const subCondition of conditions) {
        if (evaluateCondition(subCondition, context, depth + 1)) return true;
      }
      return false;
    case 'not':
      if (conditions.length === 0) return false;
      return !evaluateCondition(conditions[0]!, context, depth + 1);
    default:
      return false;
  }
}
