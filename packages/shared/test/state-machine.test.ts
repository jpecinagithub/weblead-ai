import { describe, expect, it } from 'vitest';
import {
  assertTransition,
  BUSINESS_STATES,
  BUSINESS_TRANSITIONS,
  canTransition,
  IllegalTransitionError,
  isBusinessState,
} from '../src/state-machine.js';

describe('orchestrator state machine (18 states, master prompt §0)', () => {
  it('has exactly the 18 states from the master prompt, in order', () => {
    expect(BUSINESS_STATES).toEqual([
      'DISCOVERED',
      'RESEARCHING',
      'RESEARCHED',
      'QUALIFIED',
      'REJECTED',
      'DESIGNING',
      'PREVIEW_READY',
      'AUDITING',
      'AUDIT_FAILED',
      'APPROVED',
      'SALES_PENDING',
      'SALES_APPROVED',
      'CONTACTED',
      'REPLIED',
      'NEGOTIATION',
      'WON',
      'LOST',
      'ARCHIVED',
    ]);
    expect(Object.keys(BUSINESS_TRANSITIONS)).toHaveLength(18);
  });

  it('allows the happy-path pipeline step by step', () => {
    const happyPath = [
      'DISCOVERED',
      'RESEARCHING',
      'RESEARCHED',
      'QUALIFIED',
      'DESIGNING',
      'PREVIEW_READY',
      'AUDITING',
      'APPROVED',
      'SALES_PENDING',
      'SALES_APPROVED',
      'CONTACTED',
      'REPLIED',
      'NEGOTIATION',
      'WON',
      'ARCHIVED',
    ] as const;
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(canTransition(happyPath[i], happyPath[i + 1])).toBe(true);
    }
  });

  it('rejects the illegal jump DISCOVERED -> APPROVED', () => {
    expect(canTransition('DISCOVERED', 'APPROVED')).toBe(false);
    expect(() => assertTransition('DISCOVERED', 'APPROVED')).toThrow(IllegalTransitionError);
    expect(() => assertTransition('DISCOVERED', 'APPROVED')).toThrow(
      /Illegal business transition: DISCOVERED -> APPROVED/,
    );
  });

  it('rejects other illegal jumps (no skipping audit or sales gates)', () => {
    expect(canTransition('RESEARCHED', 'APPROVED')).toBe(false);
    expect(canTransition('DESIGNING', 'APPROVED')).toBe(false);
    expect(canTransition('PREVIEW_READY', 'APPROVED')).toBe(false);
    expect(canTransition('QUALIFIED', 'CONTACTED')).toBe(false);
    expect(canTransition('DISCOVERED', 'WON')).toBe(false);
    expect(canTransition('SALES_PENDING', 'CONTACTED')).toBe(false);
  });

  it('allows the documented rework loops', () => {
    expect(canTransition('RESEARCHED', 'RESEARCHING')).toBe(true);
    expect(canTransition('PREVIEW_READY', 'DESIGNING')).toBe(true);
    expect(canTransition('AUDIT_FAILED', 'DESIGNING')).toBe(true);
    expect(canTransition('AUDITING', 'AUDIT_FAILED')).toBe(true);
  });

  it('ARCHIVED is terminal and REJECTED only archives', () => {
    expect(BUSINESS_TRANSITIONS.ARCHIVED).toEqual([]);
    expect(canTransition('ARCHIVED', 'DISCOVERED')).toBe(false);
    expect(BUSINESS_TRANSITIONS.REJECTED).toEqual(['ARCHIVED']);
  });

  it('isBusinessState guards unknown values', () => {
    expect(isBusinessState('DISCOVERED')).toBe(true);
    expect(isBusinessState('DONE')).toBe(false);
    expect(isBusinessState(undefined)).toBe(false);
  });
});
