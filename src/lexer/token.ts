import type { Span } from "../util/span.js";

export type TokenKind =
  | "Identifier"
  | "Number"
  | "String"
  | "Comment"
  | "LeftBrace"
  | "RightBrace"
  | "LeftParen"
  | "RightParen"
  | "Comma"
  | "Dot"
  | "Question"
  | "EOF";

export interface Token {
  readonly kind: TokenKind;
  readonly span: Span;
  readonly text: string;
  readonly value?: string;
}
