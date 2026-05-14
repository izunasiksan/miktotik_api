import { describe, it, expect } from 'vitest';
import { buildTimeline } from './normalization.js';

describe('buildTimeline', () => {
  it('builds hourly slots inclusive', () => {
    const s = '2025-01-01T00:00:00.000Z';
    const e = '2025-01-01T02:00:00.000Z';
    const xs = buildTimeline(s, e, 'hour');
    expect(xs.length).toBe(3);
    expect(xs[0]).toBe('2025-01-01T00:00:00.000Z');
    expect(xs[2]).toBe('2025-01-01T02:00:00.000Z');
  });
  it('builds daily slots inclusive', () => {
    const s = '2025-01-01T00:00:00.000Z';
    const e = '2025-01-03T00:00:00.000Z';
    const xs = buildTimeline(s, e, 'day');
    expect(xs.length).toBe(3);
  });
  it('builds monthly slots inclusive', () => {
    const s = '2025-01-01T00:00:00.000Z';
    const e = '2025-03-01T00:00:00.000Z';
    const xs = buildTimeline(s, e, 'month');
    expect(xs.length).toBe(3);
  });
});
