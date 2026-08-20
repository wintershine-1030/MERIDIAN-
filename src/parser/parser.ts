import {
  columnDeclaration as makeColumnDeclaration,
  defaultClause as makeDefaultClause,
  indexDeclaration as makeIndexDeclaration,
  stringLiteral as makeStringLiteral,
  tableDeclaration as makeTableDeclaration,
  typeReference as makeTypeReference,
} from "../ast/factory.js";
import type {
  ColumnDeclaration,
  DefaultClause,
  IndexDeclaration,
  ReferencesClause,
  TableDeclaration,
  TypeReference,
} from "../ast/nodes.js";
import { createDiagnostic, type Diagnostic } from "../errors/diagnostic.js";
import type { Token, TokenKind } from "../lexer/token.js";
import { LineIndex, type Span } from "../util/span.js";
import { PARSE_UNEXPECTED_TOKEN } from "./codes.js";

export interface ParseTableResult {
  readonly table: TableDeclaration;
  readonly diagnostics: readonly Diagnostic[];
}

function describeToken(token: Token): string {
  return token.kind === "EOF" ? "end of file" : token.text;
}

class ParserContext {
  private index = 0;
  private readonly tokens: readonly Token[];
  private readonly lineIndex: LineIndex;
  private readonly file: string;
  readonly diagnostics: Diagnostic[] = [];

  constructor(tokens: readonly Token[], source: string, file: string) {
    this.tokens = tokens.filter((token) => token.kind !== "Comment");
    this.lineIndex = new LineIndex(source);
    this.file = file;
  }

  peek(offset = 0): Token {
    const target = Math.min(this.index + offset, this.tokens.length - 1);
    return this.tokens[target]!;
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

  checkIdentifierText(text: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token.kind === "Identifier" && token.text === text;
  }

  atEnd(): boolean {
    return this.peek().kind === "EOF";
  }

  report(message: string, span: Span): void {
    this.diagnostics.push(
      createDiagnostic({
        code: PARSE_UNEXPECTED_TOKEN,
        severity: "error",
        message,
        file: this.file,
        start: this.lineIndex.positionAt(span.start),
        end: this.lineIndex.positionAt(span.end),
      }),
    );
  }

  expectIdentifierText(expected: string): Token {
    const token = this.peek();
    if (token.kind === "Identifier" && token.text === expected) {
      return this.advance();
    }
    this.report(`expected '${expected}', found '${describeToken(token)}'`, token.span);
    return this.advance();
  }

  expectKind(kind: TokenKind, description: string): Token {
    const token = this.peek();
    if (token.kind === kind) {
      return this.advance();
    }
    this.report(`expected ${description}, found '${describeToken(token)}'`, token.span);
    return this.advance();
  }
}

function parseType(ctx: ParserContext): TypeReference {
  const nameToken = ctx.expectKind("Identifier", "a type name");
  let end = nameToken.span.end;
  let nullable = false;
  if (ctx.check("Question")) {
    const question = ctx.advance();
    nullable = true;
    end = question.span.end;
  }
  return makeTypeReference({ span: { start: nameToken.span.start, end }, name: nameToken.text, nullable });
}

interface Modifiers {
  readonly primaryKey: boolean;
  readonly unique: boolean;
  readonly references: ReferencesClause | null;
  readonly default: DefaultClause | null;
}

function parseModifiers(ctx: ParserContext): Modifiers {
  let primaryKey = false;
  let unique = false;
  let defaultClause: DefaultClause | null = null;

  while (true) {
    if (ctx.checkIdentifierText("primary") && ctx.checkIdentifierText("key", 1)) {
      ctx.advance();
      ctx.advance();
      primaryKey = true;
      continue;
    }
    if (ctx.checkIdentifierText("not") && ctx.checkIdentifierText("null", 1)) {
      ctx.advance();
      ctx.advance();
      continue;
    }
    if (ctx.checkIdentifierText("unique")) {
      ctx.advance();
      unique = true;
      continue;
    }
    if (ctx.checkIdentifierText("default")) {
      const keyword = ctx.advance();
      const literal = ctx.expectKind("String", "a default literal");
      defaultClause = makeDefaultClause({
        span: { start: keyword.span.start, end: literal.span.end },
        value: makeStringLiteral({ span: literal.span, value: literal.value ?? "" }),
      });
      continue;
    }
    break;
  }

  return { primaryKey, unique, references: null, default: defaultClause };
}

function parseColumn(ctx: ParserContext): ColumnDeclaration {
  const nameToken = ctx.expectKind("Identifier", "a column name");
  const type = parseType(ctx);
  const modifiers = parseModifiers(ctx);
  return makeColumnDeclaration({
    span: { start: nameToken.span.start, end: type.span.end },
    name: nameToken.text,
    type,
    primaryKey: modifiers.primaryKey,
    notNull: !type.nullable,
    unique: modifiers.unique,
    references: modifiers.references,
    default: modifiers.default,
  });
}

function parseIndexDeclaration(ctx: ParserContext): IndexDeclaration {
  const keyword = ctx.expectIdentifierText("index");
  ctx.expectKind("LeftParen", "'('");
  const columns: string[] = [];
  if (!ctx.check("RightParen")) {
    columns.push(ctx.expectKind("Identifier", "a column name").text);
    while (ctx.check("Comma")) {
      ctx.advance();
      columns.push(ctx.expectKind("Identifier", "a column name").text);
    }
  }
  const closeParen = ctx.expectKind("RightParen", "')'");
  let end = closeParen.span.end;
  let unique = false;
  if (ctx.checkIdentifierText("unique")) {
    const uniqueToken = ctx.advance();
    unique = true;
    end = uniqueToken.span.end;
  }
  return makeIndexDeclaration({ span: { start: keyword.span.start, end }, columns, unique });
}

function synchronizeToColumnStart(ctx: ParserContext): void {
  while (!ctx.atEnd() && !ctx.check("RightBrace") && !ctx.check("Identifier")) {
    ctx.advance();
  }
}

function parseTableBody(ctx: ParserContext): TableDeclaration {
  const start = ctx.peek().span.start;
  ctx.expectIdentifierText("table");
  const nameToken = ctx.expectKind("Identifier", "a table name");
  ctx.expectKind("LeftBrace", "'{'");

  const columns: ColumnDeclaration[] = [];
  const indexes: IndexDeclaration[] = [];
  while (!ctx.atEnd() && !ctx.check("RightBrace")) {
    if (!ctx.check("Identifier")) {
      ctx.report(`unexpected token '${describeToken(ctx.peek())}'`, ctx.peek().span);
      ctx.advance();
      synchronizeToColumnStart(ctx);
      continue;
    }
    if (ctx.checkIdentifierText("index")) {
      indexes.push(parseIndexDeclaration(ctx));
      continue;
    }
    columns.push(parseColumn(ctx));
  }

  const closeBrace = ctx.expectKind("RightBrace", "'}'");

  return makeTableDeclaration({
    span: { start, end: closeBrace.span.end },
    name: nameToken.text,
    columns,
    indexes,
  });
}

export function parseTable(tokens: readonly Token[], source: string, file: string): ParseTableResult {
  const ctx = new ParserContext(tokens, source, file);
  const table = parseTableBody(ctx);
  return { table, diagnostics: ctx.diagnostics };
}
