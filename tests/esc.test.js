// ─── esc() — the only thing standing between user input and innerHTML ───
import { describe, it, expect } from 'vitest';
import { esc } from '../src/lib/ui.js';

describe('esc', () => {
  it('escapes the four HTML-dangerous characters', () => {
    expect(esc('<script>"a" & b</script>'))
      .toBe('&lt;script&gt;&quot;a&quot; &amp; b&lt;/script&gt;');
  });

  it('coerces non-strings instead of crashing', () => {
    expect(esc(42)).toBe('42');
    expect(esc(null)).toBe('null');
    expect(esc(undefined)).toBe('undefined');
  });

  it('leaves clean Situation names untouched', () => {
    expect(esc('The move to Windhoek')).toBe('The move to Windhoek');
  });
});
