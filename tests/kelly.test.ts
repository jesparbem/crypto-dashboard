import { describe, it, expect } from 'bun:test';
import { calculateKelly } from '../src/kelly.ts';

describe('calculateKelly', () => {
  it('returns 0.05 default when no history', () => {
    expect(calculateKelly(0, 0, 0, 0)).toBe(0.05);
  });

  it('returns 0 for losing strategy', () => {
    expect(calculateKelly(3, 7, 1, 1)).toBe(0);
  });

  it('caps at 0.25 for strong strategy', () => {
    expect(calculateKelly(6, 4, 2, 1)).toBe(0.25);
  });

  it('caps at 0.25 for perfect strategy', () => {
    expect(calculateKelly(10, 0, 10, 1)).toBe(0.25);
  });

  it('returns 0 for negative kelly', () => {
    expect(calculateKelly(1, 9, 0.5, 2)).toBe(0);
  });
});
