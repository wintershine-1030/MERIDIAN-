import { columnDeclaration, tableDeclaration, typeReference } from "../ast/factory.js";
import type { ColumnDeclaration, TableDeclaration, TypeReference } from "../ast/nodes.js";
import { createDiagnostic, type Diagnostic } from "../errors/diagnostic.js";
import type { Token, TokenKind } from "../lexer/token.js";
import { LineIndex, type Span } from "../util/span.js";
import { PARSE_UNEXPECTED_TOKEN } from "./codes.js";

export interface ParseTableResult {
  readonly table: TableDeclaration;
  readonly diagnostics: readonly Diagnostic[];
}

class Cursor {
  private index = 0;
  private readonly tokens: readonly Token[];

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens.filter((token) => token.kind !== "Comment");
  }

  peek(): Token {
    return this.tokens[this.index]!;
  }

  advance(): Token {
    const token = this.peek();
    if (token.kind !== "EOF") {
      this.index++;
    }
    return token;
  }

  check(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }

  atEnd(): boolean {
    return this.peek().kind === "EOF";
  }
}

function describeToken(token: Token): string {
  return token.kind === "EOF" ? "end of file" : token.text;
}

export function parseTable(tokens: readonly Token[], source: string, file: string): ParseTableResult {
  const cursor = new Cursor(tokens);
  const diagnostics: Diagnostic[] = [];
  const lineIndex = new LineIndex(source);

  function report(message: string, span: Span): void {
    diagnostics.push(
      createDiagnostic({
        code: PARSE_UNEXPECTED_TOKEN,
        severity: "error",
        message,
        file,
        start: lineIndex.positionAt(span.start),
        end: lineIndex.positionAt(span.end),
      }),
    );
  }

  function expectIdentifierText(expected: string): Token {
    const token = cursor.peek();
    if (token.kind === "Identifier" && token.text === expected) {
      return cursor.advance();
    }
    report(`expected '${expected}', found '${describeToken(token)}'`, token.span);
    return cursor.advance();
  }

  function expectKind(kind: TokenKind, description: string): Token {
    const token = cursor.peek();
    if (token.kind === kind) {
      return cursor.advance();
    }
    report(`expected ${description}, found '${describeToken(token)}'`, token.span);
    return cursor.advance();
  }

  function parseType(): TypeReference {
    const nameToken = expectKind("Identifier", "a type name");
    return typeReference({ span: nameToken.span, name: nameToken.text, nullable: false });
  }

  function parseColumn(): ColumnDeclaration {
    const nameToken = expectKind("Identifier", "a column name");
    const type = parseType();
    return columnDeclaration({
      span: { start: nameToken.span.start, end: type.span.end },
      name: nameToken.text,
      type,
      primaryKey: false,
      notNull: false,
      unique: false,
      references: null,
      default: null,
    });
  }

  const start = cursor.peek().span.start;
  expectIdentifierText("table");
  const nameToken = expectKind("Identifier", "a table name");
  expectKind("LeftBrace", "'{'");

  const columns: ColumnDeclaration[] = [];
  while (!cursor.atEnd() && !cursor.check("RightBrace")) {
    columns.push(parseColumn());
  }

  const closeBrace = expectKind("RightBrace", "'}'");

  return {
    table: tableDeclaration({
      span: { start, end: closeBrace.span.end },
      name: nameToken.text,
      columns,
      indexes: [],
    }),
    diagnostics,
  };
}
