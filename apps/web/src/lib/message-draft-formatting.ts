export type DraftSelection = {
  start: number;
  end: number;
};

export type DraftFormatAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "codeBlock"
  | "quote"
  | "spoiler";

type DraftFormatResult = {
  text: string;
  selection: DraftSelection;
};

const INLINE_DELIMITERS: Record<
  Exclude<DraftFormatAction, "codeBlock" | "quote">,
  string
> = {
  bold: "**",
  italic: "_",
  strikethrough: "~~",
  code: "`",
  spoiler: "||",
};

export function normalizeDraftSelection(
  selection: DraftSelection,
  textLength: number,
): DraftSelection {
  const start = Math.max(
    0,
    Math.min(selection.start, selection.end, textLength),
  );
  const end = Math.max(
    start,
    Math.min(Math.max(selection.start, selection.end), textLength),
  );

  return { start, end };
}

export function applyDraftFormatting(
  text: string,
  selection: DraftSelection,
  action: DraftFormatAction,
): DraftFormatResult {
  const normalizedSelection = normalizeDraftSelection(selection, text.length);

  switch (action) {
    case "bold":
    case "italic":
    case "strikethrough":
    case "code":
    case "spoiler":
      return applyInlineDelimiter(
        text,
        normalizedSelection,
        INLINE_DELIMITERS[action],
      );
    case "codeBlock":
      return applyCodeBlock(text, normalizedSelection);
    case "quote":
      return applyQuoteBlock(text, normalizedSelection);
  }
}

export function insertDraftSnippet(
  text: string,
  selection: DraftSelection,
  snippet: string,
): DraftFormatResult {
  const normalizedSelection = normalizeDraftSelection(selection, text.length);
  const nextText = replaceSelection(text, normalizedSelection, snippet);
  const cursor = normalizedSelection.start + snippet.length;

  return {
    text: nextText,
    selection: { start: cursor, end: cursor },
  };
}

function applyInlineDelimiter(
  text: string,
  selection: DraftSelection,
  delimiter: string,
): DraftFormatResult {
  const selectedText = text.slice(selection.start, selection.end);
  const replacement = `${delimiter}${selectedText}${delimiter}`;
  const nextText = replaceSelection(text, selection, replacement);
  const cursorStart = selection.start + delimiter.length;

  return {
    text: nextText,
    selection: {
      start: cursorStart,
      end: cursorStart + selectedText.length,
    },
  };
}

function applyCodeBlock(
  text: string,
  selection: DraftSelection,
): DraftFormatResult {
  const selectedText = text.slice(selection.start, selection.end);
  const { prefix, suffix } = blockBoundaryPadding(text, selection);
  const openingFence = `${prefix}\`\`\`\n`;
  const closingFence = `\n\`\`\`${suffix}`;
  const replacement = `${openingFence}${selectedText}${closingFence}`;
  const nextText = replaceSelection(text, selection, replacement);
  const contentStart = selection.start + openingFence.length;

  return {
    text: nextText,
    selection: {
      start: contentStart,
      end: contentStart + selectedText.length,
    },
  };
}

function applyQuoteBlock(
  text: string,
  selection: DraftSelection,
): DraftFormatResult {
  const selectedText = text.slice(selection.start, selection.end);

  if (!selectedText) {
    const prefix =
      selection.start > 0 && text[selection.start - 1] !== "\n" ? "\n" : "";
    const replacement = `${prefix}> `;
    const nextText = replaceSelection(text, selection, replacement);
    const cursor = selection.start + replacement.length;

    return {
      text: nextText,
      selection: { start: cursor, end: cursor },
    };
  }

  const { prefix, suffix } = blockBoundaryPadding(text, selection);
  const quotedText = selectedText
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const replacement = `${prefix}${quotedText}${suffix}`;
  const nextText = replaceSelection(text, selection, replacement);
  const cursor = selection.start + replacement.length - suffix.length;

  return {
    text: nextText,
    selection: { start: cursor, end: cursor },
  };
}

function blockBoundaryPadding(text: string, selection: DraftSelection) {
  const prefix =
    selection.start > 0 && text[selection.start - 1] !== "\n" ? "\n" : "";
  const suffix =
    selection.end < text.length && text[selection.end] !== "\n" ? "\n" : "";

  return { prefix, suffix };
}

function replaceSelection(
  text: string,
  selection: DraftSelection,
  replacement: string,
) {
  return text.slice(0, selection.start) + replacement + text.slice(selection.end);
}
