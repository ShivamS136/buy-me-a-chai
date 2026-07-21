import { describe, expect, it } from 'vitest';
import { parseBio } from './markdown.ts';

describe('parseBio', () => {
  it('parses plain text as one paragraph of one text node', () => {
    expect(parseBio('hello world')).toEqual([[{ type: 'text', value: 'hello world' }]]);
  });

  it('parses **bold**', () => {
    expect(parseBio('a **b** c')).toEqual([
      [
        { type: 'text', value: 'a ' },
        { type: 'strong', children: [{ type: 'text', value: 'b' }] },
        { type: 'text', value: ' c' },
      ],
    ]);
  });

  it('parses _italics_', () => {
    expect(parseBio('_hi_')).toEqual([[{ type: 'em', children: [{ type: 'text', value: 'hi' }] }]]);
  });

  it('parses an http(s) link', () => {
    expect(parseBio('[repo](https://github.com/x)')).toEqual([
      [{ type: 'link', href: 'https://github.com/x', children: [{ type: 'text', value: 'repo' }] }],
    ]);
  });

  it('nests markers inside one another', () => {
    expect(parseBio('**a _b_**')).toEqual([
      [
        {
          type: 'strong',
          children: [
            { type: 'text', value: 'a ' },
            { type: 'em', children: [{ type: 'text', value: 'b' }] },
          ],
        },
      ],
    ]);
  });

  it('never linkifies a non-http scheme — the source stays literal text', () => {
    // Defence in depth: the schema already rejects javascript:, but the renderer
    // must never emit an anchor for one either.
    expect(parseBio('[x](javascript:alert(1))')).toEqual([
      [{ type: 'text', value: '[x](javascript:alert(1))' }],
    ]);
  });

  it('treats an unclosed marker as literal', () => {
    expect(parseBio('a ** b')).toEqual([[{ type: 'text', value: 'a ** b' }]]);
    expect(parseBio('a _ b')).toEqual([[{ type: 'text', value: 'a _ b' }]]);
  });

  it('splits paragraphs on any run of newlines', () => {
    expect(parseBio('one\n\ntwo\nthree')).toEqual([
      [{ type: 'text', value: 'one' }],
      [{ type: 'text', value: 'two' }],
      [{ type: 'text', value: 'three' }],
    ]);
  });

  it('drops empty/whitespace-only input', () => {
    expect(parseBio('   \n\n  ')).toEqual([]);
  });
});
