import { describe, it, expect, afterEach } from 'bun:test';
import { isDevRuntime, isDeveloperFeedbackEnabled, isZhangyugeAgentCliEnabled } from '../feature-flags.ts';

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  ZHANGYUGE_AGENT_DEBUG: process.env.ZHANGYUGE_AGENT_DEBUG,
  ZHANGYUGE_AGENT_FEATURE_DEVELOPER_FEEDBACK: process.env.ZHANGYUGE_AGENT_FEATURE_DEVELOPER_FEEDBACK,
  ZHANGYUGE_AGENT_FEATURE_CLI: process.env.ZHANGYUGE_AGENT_FEATURE_CLI,
};

afterEach(() => {
  if (ORIGINAL_ENV.NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;

  if (ORIGINAL_ENV.ZHANGYUGE_AGENT_DEBUG === undefined) delete process.env.ZHANGYUGE_AGENT_DEBUG;
  else process.env.ZHANGYUGE_AGENT_DEBUG = ORIGINAL_ENV.ZHANGYUGE_AGENT_DEBUG;

  if (ORIGINAL_ENV.ZHANGYUGE_AGENT_FEATURE_DEVELOPER_FEEDBACK === undefined) delete process.env.ZHANGYUGE_AGENT_FEATURE_DEVELOPER_FEEDBACK;
  else process.env.ZHANGYUGE_AGENT_FEATURE_DEVELOPER_FEEDBACK = ORIGINAL_ENV.ZHANGYUGE_AGENT_FEATURE_DEVELOPER_FEEDBACK;

  if (ORIGINAL_ENV.ZHANGYUGE_AGENT_FEATURE_CLI === undefined) delete process.env.ZHANGYUGE_AGENT_FEATURE_CLI;
  else process.env.ZHANGYUGE_AGENT_FEATURE_CLI = ORIGINAL_ENV.ZHANGYUGE_AGENT_FEATURE_CLI;
});

describe('feature-flags runtime helpers', () => {
  it('isDevRuntime returns true for explicit dev NODE_ENV', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ZHANGYUGE_AGENT_DEBUG;

    expect(isDevRuntime()).toBe(true);
  });

  it('isDevRuntime returns true for ZHANGYUGE_AGENT_DEBUG override', () => {
    process.env.NODE_ENV = 'production';
    process.env.ZHANGYUGE_AGENT_DEBUG = '1';

    expect(isDevRuntime()).toBe(true);
  });

  it('isDeveloperFeedbackEnabled honors explicit override false', () => {
    process.env.NODE_ENV = 'development';
    process.env.ZHANGYUGE_AGENT_FEATURE_DEVELOPER_FEEDBACK = '0';

    expect(isDeveloperFeedbackEnabled()).toBe(false);
  });

  it('isDeveloperFeedbackEnabled honors explicit override true', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ZHANGYUGE_AGENT_DEBUG;
    process.env.ZHANGYUGE_AGENT_FEATURE_DEVELOPER_FEEDBACK = '1';

    expect(isDeveloperFeedbackEnabled()).toBe(true);
  });

  it('isDeveloperFeedbackEnabled falls back to dev runtime when no override', () => {
    process.env.NODE_ENV = 'production';
    process.env.ZHANGYUGE_AGENT_DEBUG = '1';
    delete process.env.ZHANGYUGE_AGENT_FEATURE_DEVELOPER_FEEDBACK;

    expect(isDeveloperFeedbackEnabled()).toBe(true);
  });

  it('isZhangyugeAgentCliEnabled defaults to false when no override is set', () => {
    delete process.env.ZHANGYUGE_AGENT_FEATURE_CLI;

    expect(isZhangyugeAgentCliEnabled()).toBe(false);
  });

  it('isZhangyugeAgentCliEnabled honors explicit override true', () => {
    process.env.ZHANGYUGE_AGENT_FEATURE_CLI = '1';

    expect(isZhangyugeAgentCliEnabled()).toBe(true);
  });

  it('isZhangyugeAgentCliEnabled honors explicit override false', () => {
    process.env.ZHANGYUGE_AGENT_FEATURE_CLI = '0';

    expect(isZhangyugeAgentCliEnabled()).toBe(false);
  });
});
