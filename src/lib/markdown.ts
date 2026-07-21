/**
 * The bio's markdown subset (P0.2): `**bold**`, `_italics_`, `[text](https://…)`.
 *
 * A parser, not a renderer — it returns a plain-data AST so `Bio.tsx` can map it to
 * real `<strong>`/`<em>`/`<a>` elements. Nothing here builds an HTML string, so
 * there is no `dangerouslySetInnerHTML` and no injection surface: text that is not
 * one of the three markers is carried verbatim and React escapes it on render.
 * Framework-free by contract (ADR-004) — string in, AST out.
 *
 * Only `http(s)` links become anchors; any other scheme (the schema already rejects
 * `javascript:`, but a `mailto:` or bare word could still appear) is left as the
 * literal `[text](href)` source, never an anchor. Unclosed markers are literal too,
 * so a stray `**` or `_` in prose renders as itself rather than eating the rest of
 * the line.
 */

export type InlineNode =
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'strong'; readonly children: readonly InlineNode[] }
  | { readonly type: 'em'; readonly children: readonly InlineNode[] }
  | { readonly type: 'link'; readonly href: string; readonly children: readonly InlineNode[] };

/** `[label](href)` with a non-empty, whitespace-free href. */
const LINK_RE = /^\[([^\]]*)\]\(([^)\s]+)\)/;
const HTTP_RE = /^https?:\/\//i;

/**
 * One paragraph's inline formatting. Recurses so a link label or a bold run can
 * itself contain the other markers (`**text with _emphasis_**`).
 */
const parseInline = (text: string): InlineNode[] => {
  const nodes: InlineNode[] = [];
  let plain = '';
  let i = 0;

  const flush = (): void => {
    if (plain.length > 0) {
      nodes.push({ type: 'text', value: plain });
      plain = '';
    }
  };

  while (i < text.length) {
    if (text[i] === '[') {
      const match = LINK_RE.exec(text.slice(i));
      if (match) {
        const [full, label = '', href = ''] = match;
        if (HTTP_RE.test(href)) {
          flush();
          nodes.push({ type: 'link', href, children: parseInline(label) });
          i += full.length;
          continue;
        }
        // Not a web link — keep the source text literal rather than linkifying it.
        plain += full;
        i += full.length;
        continue;
      }
    }

    if (text.startsWith('**', i)) {
      const close = text.indexOf('**', i + 2);
      if (close !== -1) {
        flush();
        nodes.push({ type: 'strong', children: parseInline(text.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }

    if (text[i] === '_') {
      const close = text.indexOf('_', i + 1);
      // `close > i + 1` rejects an empty `__`, which is a literal, not emphasis.
      if (close > i + 1) {
        flush();
        nodes.push({ type: 'em', children: parseInline(text.slice(i + 1, close)) });
        i = close + 1;
        continue;
      }
    }

    plain += text[i];
    i += 1;
  }

  flush();
  return nodes;
};

/**
 * Parses a bio into paragraphs of inline nodes. Any run of newlines separates
 * paragraphs; the schema has already trimmed and length-capped the source.
 */
export const parseBio = (src: string): InlineNode[][] =>
  src
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseInline);
