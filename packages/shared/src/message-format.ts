export type FormattedInlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; children: FormattedInlineNode[] }
  | { type: "italic"; children: FormattedInlineNode[] }
  | { type: "strikethrough"; children: FormattedInlineNode[] }
  | { type: "spoiler"; children: FormattedInlineNode[] }
  | { type: "code"; text: string }
  | { type: "link"; text: string; url: string }
  | { type: "mention"; text: string; username: string };

export type FormattedBlockNode =
  | { type: "paragraph"; children: FormattedInlineNode[] }
  | { type: "quote"; children: FormattedInlineNode[] }
  | { type: "codeBlock"; text: string; language?: string };

type InlinePatternMatch =
  | { kind: "link"; index: number; length: number; url: string }
  | { kind: "code"; index: number; length: number; text: string }
  | { kind: "spoiler"; index: number; length: number; text: string }
  | { kind: "mention"; index: number; length: number; text: string }
  | { kind: "bold"; index: number; length: number; text: string }
  | { kind: "italic"; index: number; length: number; text: string }
  | { kind: "strikethrough"; index: number; length: number; text: string };

const LINK_PATTERN = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,!?;:)]/;
const CODE_PATTERN = /`([^`\n]+)`/;
const SPOILER_PATTERN = /\|\|([^|\n](?:.*?[^|\n])?)\|\|/;
const MENTION_PATTERN =
  /(^|[^A-Za-z0-9_@-])(@[A-Za-z0-9_-]{3,64})(?![A-Za-z0-9_-])/;
const BOLD_PATTERN = /\*\*([^*\n](?:.*?[^*\n])?)\*\*/;
const ITALIC_PATTERN = /_([^_\n](?:.*?[^_\n])?)_/;
const STRIKETHROUGH_PATTERN = /~~([^~\n](?:.*?[^~\n])?)~~/;

function parseInline(text: string): FormattedInlineNode[] {
  const nodes: FormattedInlineNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const slice = text.slice(cursor);
    const nextMatch = findNextInlinePattern(slice);
    if (!nextMatch) {
      nodes.push({ type: "text", text: slice });
      break;
    }

    if (nextMatch.index > 0) {
      nodes.push({ type: "text", text: slice.slice(0, nextMatch.index) });
    }

    if (nextMatch.kind === "link") {
      nodes.push({
        type: "link",
        text: nextMatch.url,
        url: nextMatch.url,
      });
    } else if (nextMatch.kind === "mention") {
      nodes.push({
        type: "mention",
        text: nextMatch.text,
        username: nextMatch.text.slice(1),
      });
    } else if (nextMatch.kind === "code") {
      nodes.push({
        type: "code",
        text: nextMatch.text,
      });
    } else {
      const childText = nextMatch.text;
      const children = parseInline(childText);
      nodes.push({
        type: nextMatch.kind,
        children,
      });
    }

    cursor += nextMatch.index + nextMatch.length;
  }

  return mergeTextNodes(nodes);
}

function findNextInlinePattern(text: string): InlinePatternMatch | null {
  const matches: InlinePatternMatch[] = [];

  const linkMatch = LINK_PATTERN.exec(text);
  if (linkMatch?.[0] !== undefined) {
    matches.push({
      kind: "link",
      index: linkMatch.index,
      length: linkMatch[0].length,
      url: linkMatch[0],
    });
  }

  const codeMatch = CODE_PATTERN.exec(text);
  if (codeMatch?.[0] !== undefined && codeMatch[1] !== undefined) {
    matches.push({
      kind: "code",
      index: codeMatch.index,
      length: codeMatch[0].length,
      text: codeMatch[1],
    });
  }

  const spoilerMatch = SPOILER_PATTERN.exec(text);
  if (spoilerMatch?.[0] !== undefined && spoilerMatch[1] !== undefined) {
    matches.push({
      kind: "spoiler",
      index: spoilerMatch.index,
      length: spoilerMatch[0].length,
      text: spoilerMatch[1],
    });
  }

  const mentionMatch = MENTION_PATTERN.exec(text);
  if (mentionMatch?.[2] !== undefined) {
    const prefix = mentionMatch[1] ?? "";
    matches.push({
      kind: "mention",
      index: mentionMatch.index + prefix.length,
      length: mentionMatch[2].length,
      text: mentionMatch[2],
    });
  }

  const boldMatch = BOLD_PATTERN.exec(text);
  if (boldMatch?.[0] !== undefined && boldMatch[1] !== undefined) {
    matches.push({
      kind: "bold",
      index: boldMatch.index,
      length: boldMatch[0].length,
      text: boldMatch[1],
    });
  }

  const strikethroughMatch = STRIKETHROUGH_PATTERN.exec(text);
  if (
    strikethroughMatch?.[0] !== undefined &&
    strikethroughMatch[1] !== undefined
  ) {
    matches.push({
      kind: "strikethrough",
      index: strikethroughMatch.index,
      length: strikethroughMatch[0].length,
      text: strikethroughMatch[1],
    });
  }

  const italicMatch = ITALIC_PATTERN.exec(text);
  if (italicMatch?.[0] !== undefined && italicMatch[1] !== undefined) {
    matches.push({
      kind: "italic",
      index: italicMatch.index,
      length: italicMatch[0].length,
      text: italicMatch[1],
    });
  }

  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => {
    if (left.index !== right.index) {
      return left.index - right.index;
    }

    return inlinePriority(left.kind) - inlinePriority(right.kind);
  });

  return matches[0] ?? null;
}

function inlinePriority(kind: InlinePatternMatch["kind"]) {
  switch (kind) {
    case "link":
      return 0;
    case "code":
      return 1;
    case "spoiler":
      return 2;
    case "mention":
      return 3;
    case "bold":
      return 4;
    case "strikethrough":
      return 5;
    case "italic":
      return 6;
  }
}

function mergeTextNodes(nodes: FormattedInlineNode[]) {
  const merged: FormattedInlineNode[] = [];

  for (const node of nodes) {
    const previous = merged[merged.length - 1];
    if (node.type === "text" && previous?.type === "text") {
      previous.text += node.text;
      continue;
    }

    merged.push(node);
  }

  return merged;
}

function findClosingCodeFence(lines: string[], startIndex: number) {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index]?.startsWith("```")) {
      return index;
    }
  }

  return -1;
}

export function parseFormattedMessage(text: string): FormattedBlockNode[] {
  if (!text.trim()) {
    return [];
  }

  const lines = text.split("\n");
  const blocks: FormattedBlockNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const closingFenceIndex = findClosingCodeFence(lines, index);
      if (closingFenceIndex !== -1) {
        const language = line.slice(3).trim() || undefined;
        const code = lines.slice(index + 1, closingFenceIndex).join("\n");
        blocks.push({
          type: "codeBlock",
          text: code,
          language,
        });
        index = closingFenceIndex + 1;
        continue;
      }
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quoteLines.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push({
        type: "quote",
        children: parseInline(quoteLines.join("\n")),
      });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const currentLine = lines[index] ?? "";
      if (currentLine.trim() === "") {
        break;
      }

      if (
        paragraphLines.length > 0 &&
        (currentLine.startsWith("```") || /^>\s?/.test(currentLine))
      ) {
        break;
      }

      paragraphLines.push(currentLine);
      index += 1;
    }

    blocks.push({
      type: "paragraph",
      children: parseInline(paragraphLines.join("\n")),
    });
  }

  return blocks;
}
