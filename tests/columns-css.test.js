import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Column counts must be user-declared (data-columns starting point) and
// responsive with library-owned breakpoints. The lib CSS must therefore NOT
// hard-code any column-count on the plain grid, and must ship the static
// attribute-driven responsive table. jsdom applies no CSS, so we assert the
// shipped stylesheet directly.

const css = readFileSync(join(process.cwd(), 'src/css/richman-gallery.css'), 'utf8');

const noWhitespace = (s) => s.replace(/\s+/g, '');

function gridBlock() {
  const match = /\.rmg-grid\s*\{/.exec(css);
  if (!match) return null;
  const start = match.index;
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return null;
}

describe('responsive columns shipped by the lib CSS', () => {
  it('hard-codes no column-count on the plain .rmg-grid', () => {
    const block = noWhitespace(gridBlock() || '');
    expect(block).not.toContain('column-count');
  });

  it('declares starting counts only via the data-columns attribute', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(css).toContain(`.rmg-gallery[data-columns="${n}"] .rmg-grid`);
    }
  });

  it('keeps responsiveness internal with static breakpoints', () => {
    expect(css).toContain('@media (max-width: 992px)');
    expect(css).toContain('@media (max-width: 768px)');
    expect(css).toContain('@media (max-width: 480px)');
  });

  it('steps the count down inside the media queries', () => {
    const compact = noWhitespace(css);
    expect(compact).toContain('@media(max-width:992px){');
    expect(compact).toContain('.rmg-gallery[data-columns="4"].rmg-grid{column-count:3;}');
    expect(compact).toContain('@media(max-width:480px){.rmg-gallery[data-columns].rmg-grid{column-count:1;}}');
  });
});
