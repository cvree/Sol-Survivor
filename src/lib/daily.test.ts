import { describe, expect, it } from 'vitest';
import { ALL_WORDS, BANK, RANKS, WORDS, newPractice, rankOf, score, wordFor, type Level } from './daily';

describe('the Daily Sol Check and practice words', () => {
  it('every word is the right length, upper case, unique and has a hint', () => {
    for (const len of [4, 5, 6] as Level[]) {
      for (const w of BANK[len]) {
        expect(w.word).toMatch(new RegExp(`^[A-Z]{${len}}$`));
        expect(w.hint.length).toBeGreaterThan(5);
      }
    }
    const words = ALL_WORDS.map((w) => w.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it("today's word still comes from the original list, so nobody's daily word changes", () => {
    expect(WORDS.map((w) => w.word)).toContain(wordFor('2026-11-16').word);
  });

  it('scores words of any length', () => {
    expect(score('MOON', 'MARS')).toEqual(['hit', 'miss', 'miss', 'miss']);
    expect(score('ROCKET', 'ROCKET').every((r) => r === 'hit')).toBe(true);
    expect(score('STARS', 'RATES')).toEqual(['miss', 'near', 'near', 'near', 'hit']);
  });

  it('a practice word has the chosen length and is never the one just played', () => {
    for (const len of [4, 5, 6] as Level[]) {
      const first = newPractice(len);
      expect(first.word).toHaveLength(len);
      for (let i = 0; i < 20; i++) expect(newPractice(len, first.word).word).not.toBe(first.word);
    }
  });

  it('ranks climb with the Word Log and the last one needs every word', () => {
    expect(rankOf(0).rank.name).toBe(RANKS[0].name);
    expect(rankOf(5).rank.name).toBe(RANKS[1].name);
    expect(rankOf(ALL_WORDS.length).next).toBeNull();
    expect(RANKS[RANKS.length - 1].at).toBe(ALL_WORDS.length);
  });
});
