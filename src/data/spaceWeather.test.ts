import { describe, expect, it } from 'vitest';
import { BRIEFS, factFor } from './spaceWeather';
import type { EventKind } from '../engine/types';

describe('space weather school', () => {
  const kinds: EventKind[] = ['flare', 'cme', 'dust'];

  it('teaches every kind of event with short cards and one fair question', () => {
    for (const k of kinds) {
      const b = BRIEFS[k];
      expect(b.cards.length).toBeGreaterThanOrEqual(4);
      expect(b.cards.length).toBeLessThanOrEqual(6);
      // One idea per card, short enough for a young reader.
      for (const c of b.cards) expect(c.say.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length).toBeLessThanOrEqual(3);
      expect(b.quiz.answer).toBeGreaterThanOrEqual(0);
      expect(b.quiz.answer).toBeLessThan(b.quiz.options.length);
      expect(b.sources.length).toBeGreaterThan(0);
      for (const s of b.sources) expect(s.link).toMatch(/^https:\/\/[a-z.]*nasa\.gov\//);
    }
  });

  it('gives a fact after each storm, always one from that kind', () => {
    for (const k of kinds) expect(BRIEFS[k].facts).toContain(factFor(k, 'storm-7'));
  });
});
