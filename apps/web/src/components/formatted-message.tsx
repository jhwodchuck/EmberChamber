"use client";

import { useState, type ReactNode } from "react";
import {
  parseFormattedMessage,
  type FormattedBlockNode,
  type FormattedInlineNode,
} from "@emberchamber/shared";

function SpoilerInline({
  nodes,
  keyPrefix,
}: {
  nodes: FormattedInlineNode[];
  keyPrefix: string;
}) {
  const [isRevealed, setIsRevealed] = useState(false);

  if (!isRevealed) {
    return (
      <button
        type="button"
        onClick={() => setIsRevealed(true)}
        className="rounded-md border border-brand-500/35 bg-brand-500/12 px-1.5 py-0.5 text-[0.92em] font-medium text-brand-100 transition hover:bg-brand-500/18"
      >
        Spoiler
      </button>
    );
  }

  return (
    <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[var(--text-primary)]">
      {renderInline(nodes, `${keyPrefix}-content`)}
    </span>
  );
}

function renderInline(
  nodes: FormattedInlineNode[],
  keyPrefix: string,
): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (node.type) {
      case "text":
        return node.text;
      case "link":
        return (
          <a
            key={key}
            href={node.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand-600 underline decoration-brand-500/60 underline-offset-4 hover:text-brand-500"
          >
            {node.text}
          </a>
        );
      case "code":
        return (
          <code
            key={key}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-1.5 py-0.5 font-mono text-[0.92em] text-[#ffd0b6]"
          >
            {node.text}
          </code>
        );
      case "mention":
        return (
          <span key={key} className="font-medium text-brand-500">
            {node.text}
          </span>
        );
      case "spoiler":
        return (
          <SpoilerInline key={key} nodes={node.children} keyPrefix={key} />
        );
      case "bold":
        return (
          <strong key={key}>
            {renderInline(node.children, `${key}-bold`)}
          </strong>
        );
      case "italic":
        return (
          <em key={key}>{renderInline(node.children, `${key}-italic`)}</em>
        );
      case "strikethrough":
        return <s key={key}>{renderInline(node.children, `${key}-strike`)}</s>;
    }
  });
}

function renderBlock(block: FormattedBlockNode, key: string) {
  switch (block.type) {
    case "paragraph":
      return (
        <p
          key={key}
          className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]"
        >
          {renderInline(block.children, `${key}-inline`)}
        </p>
      );
    case "quote":
      return (
        <blockquote
          key={key}
          className="border-l-2 border-brand-500/45 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-secondary)]"
        >
          <p className="whitespace-pre-wrap leading-6">
            {renderInline(block.children, `${key}-quote`)}
          </p>
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 text-sm leading-6 text-[#ffd0b6]"
        >
          <code>{block.text}</code>
        </pre>
      );
  }
}

export function FormattedMessage({
  text,
  className = "mt-2 space-y-2",
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseFormattedMessage(text);
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {blocks.map((block, index) => renderBlock(block, `block-${index}`))}
    </div>
  );
}
