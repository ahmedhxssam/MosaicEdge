import { describe, expect, it } from 'vitest';
import { JUDGE_MODE_STEPS, getJudgeModeStep, judgeModeProgress } from '@/data/judgeMode';

describe('judge mode walkthrough', () => {
  it('covers every judge-facing page in the expected order', () => {
    expect(JUDGE_MODE_STEPS.map((step) => step.view)).toEqual([
      'overview',
      'feed',
      'queue',
      'graph',
      'timeline',
      'whatchanged',
      'console',
      'review',
      'sync',
      'security',
      'edge',
      'architecture',
      'evaluation',
      'sources',
      'docs',
    ]);
  });

  it('keeps every step simple, judge-focused, and connected to the larger story', () => {
    for (const step of JUDGE_MODE_STEPS) {
      expect(step.title.length).toBeGreaterThan(4);
      expect(step.simpleExplanation.length).toBeGreaterThan(30);
      expect(step.sections.length).toBeGreaterThanOrEqual(2);
      expect(step.wowFactor.length).toBeGreaterThan(20);
      expect(step.connection.length).toBeGreaterThan(20);
      expect(step.judgeTakeaway.length).toBeGreaterThan(20);
    }
  });

  it('clamps step lookup and reports human-readable progress', () => {
    expect(getJudgeModeStep(-3).id).toBe(JUDGE_MODE_STEPS[0].id);
    expect(getJudgeModeStep(999).id).toBe(JUDGE_MODE_STEPS[JUDGE_MODE_STEPS.length - 1].id);
    expect(judgeModeProgress(0)).toEqual({ current: 1, total: JUDGE_MODE_STEPS.length, percent: 7 });
  });
});
