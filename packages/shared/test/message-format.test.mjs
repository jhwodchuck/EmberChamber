import test from "node:test";
import assert from "node:assert/strict";

import { parseFormattedMessage } from "../dist/index.js";

test("parses inline emphasis, links, and inline code", () => {
  const blocks = parseFormattedMessage("Hello **bold** _italic_ ~~gone~~ `code` https://emberchamber.com");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "paragraph");

  const children = blocks[0].children;
  assert.equal(children.some((node) => node.type === "bold"), true);
  assert.equal(children.some((node) => node.type === "italic"), true);
  assert.equal(children.some((node) => node.type === "strikethrough"), true);
  assert.equal(children.some((node) => node.type === "code"), true);
  assert.equal(children.some((node) => node.type === "link"), true);
});

test("parses mentions and spoilers without mangling emails", () => {
  const blocks = parseFormattedMessage("Talk to @ember-alpha at owner@example.com and ||keep this quiet||.");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "paragraph");

  const children = blocks[0].children;
  assert.equal(children.some((node) => node.type === "mention" && node.username === "ember-alpha"), true);
  assert.equal(children.some((node) => node.type === "spoiler"), true);
  assert.equal(children.some((node) => node.type === "mention" && node.username === "example"), false);
});

test("parses quote and code block structures", () => {
  const blocks = parseFormattedMessage("> quoted line\n> next line\n\n```ts\nconst x = 1;\n```");
  assert.equal(blocks.length, 2);
  assert.deepEqual(
    blocks.map((block) => block.type),
    ["quote", "codeBlock"],
  );

  assert.equal(blocks[1].text, "const x = 1;");
  assert.equal(blocks[1].language, "ts");
});

test("leaves unsupported or incomplete markers as text", () => {
  const blocks = parseFormattedMessage("This stays **open and plain plus ||unfinished spoiler");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "paragraph");
  assert.deepEqual(blocks[0].children, [
    { type: "text", text: "This stays **open and plain plus ||unfinished spoiler" },
  ]);
});
