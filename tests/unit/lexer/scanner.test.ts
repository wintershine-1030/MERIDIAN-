import { describe, expect, it } from "vitest";
import { LEX_UNEXPECTED_CHARACTER, LEX_UNTERMINATED_STRING } from "../../../src/lexer/codes.js";
import { lex } from "../../../src/lexer/scanner.js";
import { LineIndex } from "../../../src/util/span.js";
import { readFixture } from "../../helpers/fixtures.js";

describe("lex over the basic fixture", () => {
  it("tokenizes two table declarations with no diagnostics", () => {
    const source = readFixture("schemas/basic.mrd");
    const { tokens, diagnostics } = lex(source, "basic.mrd");

    expect(diagnostics).toEqual([]);
    expect(tokens.at(-1)?.kind).toBe("EOF");

    const counts = new Map<string, number>();
    for (const token of tokens) {
      counts.set(token.kind, (counts.get(token.kind) ?? 0) + 1);
    }

    expect(counts.get("LeftBrace")).toBe(2);
    expect(counts.get("RightBrace")).toBe(2);
    expect(counts.get("LeftParen")).toBe(1);
    expect(counts.get("RightParen")).toBe(1);
    expect(counts.get("Comma")).toBe(1);
    expect(counts.get("Dot")).toBe(2);
    expect(counts.get("Question")).toBe(3);
    expect(counts.get("String")).toBe(1);
    expect(counts.get("Comment")).toBeUndefined();
  });
});

describe("lex over the comments-and-escapes fixture", () => {
  it("produces the exact expected token stream", () => {
    const source = readFixture("schemas/comments-and-escapes.mrd");
    const { tokens, diagnostics } = lex(source, "comments-and-escapes.mrd");

    expect(diagnostics).toEqual([]);
    expect(tokens.map((token) => token.kind)).toEqual([
      "Comment",
      "Identifier",
      "Identifier",
      "LeftBrace",
      "Identifier",
      "Identifier",
      "Question",
      "Identifier",
      "String",
      "RightBrace",
      "EOF",
    ]);

    const stringToken = tokens.find((token) => token.kind === "String");
    expect(stringToken?.value).toBe('line1\nline2 "quoted" end');
  });
});

describe("lex over the unterminated-string fixture", () => {
  it("reports one diagnostic with a span from the opening quote to the line end", () => {
    const source = readFixture("schemas/unterminated-string.mrd");
    const { diagnostics } = lex(source, "unterminated-string.mrd");

    expect(diagnostics).toHaveLength(1);
    const [diagnostic] = diagnostics;
    expect(diagnostic?.code).toBe(LEX_UNTERMINATED_STRING);
    expect(diagnostic?.severity).toBe("error");

    const lineIndex = new LineIndex(source);
    const quoteOffset = source.indexOf('"');
    const newlineOffset = source.indexOf("\n", quoteOffset);
    expect(diagnostic?.start).toEqual(lineIndex.positionAt(quoteOffset));
    expect(diagnostic?.end).toEqual(lineIndex.positionAt(newlineOffset));
  });
});

describe("lex over the unexpected-character fixture", () => {
  it("reports the bad character and recovers to keep lexing", () => {
    const source = readFixture("schemas/unexpected-character.mrd");
    const { tokens, diagnostics } = lex(source, "unexpected-character.mrd");

    expect(diagnostics).toHaveLength(1);
    const [diagnostic] = diagnostics;
    expect(diagnostic?.code).toBe(LEX_UNEXPECTED_CHARACTER);

    const lineIndex = new LineIndex(source);
    const atOffset = source.indexOf("@");
    expect(diagnostic?.start).toEqual(lineIndex.positionAt(atOffset));

    expect(tokens.map((token) => token.kind)).toEqual([
      "Identifier",
      "Identifier",
      "LeftBrace",
      "Identifier",
      "Identifier",
      "Identifier",
      "Identifier",
      "RightBrace",
      "EOF",
    ]);
  });
});
