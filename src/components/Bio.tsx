import { Fragment, type JSX } from 'react';
import { type InlineNode, parseBio } from '../lib/markdown.ts';

/**
 * The bio's trust text (P0.2), rendered from the markdown-subset AST.
 *
 * `parseBio` returns plain data; this maps it to real elements, so there is no HTML
 * string and no injection surface (only `http(s)` links ever become anchors — see
 * markdown.ts). Renders nothing when the bio is empty after parsing.
 */

/** A paragraph's plain text — a stable React key that never depends on order. */
const plainText = (nodes: readonly InlineNode[]): string =>
  nodes.map((node) => (node.type === 'text' ? node.value : plainText(node.children))).join('');

const renderInline = (nodes: readonly InlineNode[]): JSX.Element[] =>
  nodes.map((node, index) => {
    const key = `${node.type}-${index}`;
    if (node.type === 'text') return <Fragment key={key}>{node.value}</Fragment>;
    if (node.type === 'strong') {
      return (
        <strong key={key} className="font-semibold">
          {renderInline(node.children)}
        </strong>
      );
    }
    if (node.type === 'em') return <em key={key}>{renderInline(node.children)}</em>;
    // The only remaining kind is a link.
    return (
      <a
        key={key}
        href={node.href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-chai-accent-strong underline underline-offset-2 hover:text-chai-accent"
      >
        {renderInline(node.children)}
      </a>
    );
  });

export interface BioProps {
  readonly bio: string;
}

export function Bio({ bio }: BioProps): JSX.Element | null {
  const paragraphs = parseBio(bio);
  if (paragraphs.length === 0) return null;

  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-chai-ink">
      {paragraphs.map((nodes) => (
        <p key={plainText(nodes)}>{renderInline(nodes)}</p>
      ))}
    </div>
  );
}
