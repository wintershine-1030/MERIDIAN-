import { createDiagnostic, type Diagnostic, type Severity } from "../errors/diagnostic.js";
import { LineIndex, type Span } from "../util/span.js";
import { LEX_UNEXPECTED_CHARACTER, LEX_UNTERMINATED_STRING } from "./codes.js";
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

function isIdentifierStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentifierPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

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

    if (isIdentifierStart(ch)) {
      const start = pos;
      pos++;
      while (pos < source.length && isIdentifierPart(source[pos]!)) {
        pos++;
      }
      tokens.push({ kind: "Identifier", span: { start, end: pos }, text: source.slice(start, pos) });
      continue;
    }

    if (isDigit(ch)) {
      const start = pos;
      while (pos < source.length && isDigit(source[pos]!)) {
        pos++;
      }
      tokens.push({ kind: "Number", span: { start, end: pos }, text: source.slice(start, pos) });
      continue;
    }

    if (ch === '"') {
      const start = pos;
      pos++;
      let value = "";
      let closed = false;
      while (pos < source.length) {
        const c = source[pos]!;
        if (c === '"') {
          pos++;
          closed = true;
          break;
        }
        value += c;
        pos++;
      }
      if (!closed) {
        report(LEX_UNTERMINATED_STRING, "error", "unterminated string literal", { start, end: start + 1 });
      }
      tokens.push({ kind: "String", span: { start, end: pos }, text: source.slice(start, pos), value });
      continue;
    }

    report(LEX_UNEXPECTED_CHARACTER, "error", `unexpected character '${ch}'`, { start: pos, end: pos + 1 });
    pos++;
  }

  tokens.push({ kind: "EOF", span: { start: source.length, end: source.length }, text: "" });

  return { tokens, diagnostics };
}
