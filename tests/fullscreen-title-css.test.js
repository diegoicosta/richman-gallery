import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The fullscreen title/link feature is only visible if the shipped stylesheet
// styles the title overlay. jsdom does not apply CSS, so these tests assert
// directly that the library CSS defines the rules the feature depends on.
// A rule living in an app's private stylesheet does NOT count.

const css = readFileSync(join(process.cwd(), 'src/richman-gallery.css'), 'utf8');

const noWhitespace = (s) => s.replace(/\s+/g, '');

function blockFor(selector) {
  const needle = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`);
  const match = needle.exec(css);
  if (!match) return null;
  const start = match.index + match[0].length - 1;
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(match.index, i + 1);
    }
  }
  return null;
}

describe('fullscreen title and photo link are visible (CSS shipped by the lib)', () => {
  it('defines a .rmg-title-container rule in the library stylesheet', () => {
    const block = blockFor('.rmg-title-container');
    expect(block).not.toBeNull();
  });

  it('positions the title overlay over the bottom of the viewer', () => {
    const block = blockFor('.rmg-title-container');
    expect(block).not.toBeNull();
    const compact = noWhitespace(block || '');
    expect(compact).toContain('position:absolute');
    expect(compact).toContain('bottom:');
    expect(compact).toContain('left:50%');
    expect(compact).toContain('transform:translateX(-50%)');
  });

  it('makes the title text readable on top of the image', () => {
    const block = blockFor('.rmg-title-container');
    expect(block).not.toBeNull();
    const compact = noWhitespace(block || '');
    expect(compact).toContain('color:#fff');
    expect(compact).toContain('z-index:');
    expect(compact).toContain('background-color:');
  });
});
