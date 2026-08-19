import { createDiagnostic, type Diagnostic, type Severity } from "../errors/diagnostic.js";
import { LineIndex, type Span } from "../util/span.js";
import { LEX_UNEXPECTED_CHARACTER } from "./codes.js";
import type { Token, TokenKind } from "./token.js";

export interface LexResult {
  readonly tokens: readonly Token[];
  readonly diagnostics: readonly Diagnostic[];
}

const PUNCTUATION: Record<string, TokenKind> = {
  "{": "LeftBrace",
  "}": "RightBrace",
  "(": "LeftParen",
  ")": "RightParen",
  ",": "Comma",
  ".": "Dot",
  "?": "Question",
};

export function lex(source: string, file: string): LexResult {
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  const lineIndex = new LineIndex(source);
  let pos = 0;

  function report(code: string, severity: Severity, message: string, span: Span): void {
    diagnostics.push(
      createDiagnostic({
        code,
        severity,
        message,
        file,
        start: lineIndex.positionAt(span.start),
        end: lineIndex.positionAt(span.end),
      }),
    );
  }

  while (pos < source.length) {
    const ch = source[pos]!;

    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      pos++;
      continue;
    }

    const punctuationKind = PUNCTUATION[ch];
    if (punctuationKind !== undefined) {
      tokens.push({ kind: punctuationKind, span: { start: pos, end: pos + 1 }, text: ch });
      pos++;
      continue;
    }

    report(LEX_UNEXPECTED_CHARACTER, "error", `unexpected character '${ch}'`, { start: pos, end: pos + 1 });
    pos++;
  }

  tokens.push({ kind: "EOF", span: { start: source.length, end: source.length }, text: "" });

  return { tokens, diagnostics };
}
