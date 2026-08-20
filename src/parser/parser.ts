import {
  columnDeclaration as makeColumnDeclaration,
  columnReference as makeColumnReference,
  defaultClause as makeDefaultClause,
  indexDeclaration as makeIndexDeclaration,
  referencesClause as makeReferencesClause,
  schemaFile as makeSchemaFile,
  stringLiteral as makeStringLiteral,
  tableDeclaration as makeTableDeclaration,
  typeReference as makeTypeReference,
} from "../ast/factory.js";
import type {
  ColumnDeclaration,
  DefaultClause,
  IndexDeclaration,
  ReferencesClause,
  ReferentialAction,
  SchemaFile,
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

export interface ParseSchemaFileResult {
  readonly file: SchemaFile;
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

function parseReferentialAction(ctx: ParserContext): { action: ReferentialAction; end: number } {
  if (ctx.checkIdentifierText("cascade")) {
    const token = ctx.advance();
    return { action: "cascade", end: token.span.end };
  }
  if (ctx.checkIdentifierText("restrict")) {
    const token = ctx.advance();
    return { action: "restrict", end: token.span.end };
  }
  if (ctx.checkIdentifierText("no") && ctx.checkIdentifierText("action", 1)) {
    ctx.advance();
    const token = ctx.advance();
    return { action: "no action", end: token.span.end };
  }
  if (ctx.checkIdentifierText("set") && ctx.checkIdentifierText("null", 1)) {
    ctx.advance();
    const token = ctx.advance();
    return { action: "set null", end: token.span.end };
  }
  if (ctx.checkIdentifierText("set") && ctx.checkIdentifierText("default", 1)) {
    ctx.advance();
    const token = ctx.advance();
    return { action: "set default", end: token.span.end };
  }
  const token = ctx.peek();
  ctx.report(`expected a referential action, found '${describeToken(token)}'`, token.span);
  return { action: "no action", end: ctx.advance().span.end };
}

function parseReferencesClause(ctx: ParserContext): ReferencesClause {
  const keyword = ctx.expectIdentifierText("references");
  const tableToken = ctx.expectKind("Identifier", "a referenced table name");
  ctx.expectKind("Dot", "'.'");
  const columnToken = ctx.expectKind("Identifier", "a referenced column name");
  let end = columnToken.span.end;
  let onDelete: ReferentialAction | null = null;
  if (ctx.checkIdentifierText("on") && ctx.checkIdentifierText("delete", 1)) {
    ctx.advance();
    ctx.advance();
    const result = parseReferentialAction(ctx);
    onDelete = result.action;
    end = result.end;
  }
  return makeReferencesClause({
    span: { start: keyword.span.start, end },
    target: makeColumnReference({
      span: { start: tableToken.span.start, end: columnToken.span.end },
      table: tableToken.text,
      column: columnToken.text,
    }),
    onDelete,
  });
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
  let references: ReferencesClause | null = null;
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
    if (ctx.checkIdentifierText("references")) {
      references = parseReferencesClause(ctx);
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

  return { primaryKey, unique, references, default: defaultClause };
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

function synchronizeToTableStart(ctx: ParserContext): void {
  while (!ctx.atEnd() && !ctx.checkIdentifierText("table")) {
    ctx.advance();
  }
}

export function parseSchemaFile(tokens: readonly Token[], source: string, file: string): ParseSchemaFileResult {
  const ctx = new ParserContext(tokens, source, file);
  const start = ctx.peek().span.start;
  ctx.expectIdentifierText("schema");
  const catalogToken = ctx.expectKind("Identifier", "a catalog name");
  const versionToken = ctx.expectKind("Identifier", "a version");

  const tables: TableDeclaration[] = [];
  while (!ctx.atEnd()) {
    if (ctx.checkIdentifierText("table")) {
      tables.push(parseTableBody(ctx));
      continue;
    }
    ctx.report(`unexpected token '${describeToken(ctx.peek())}'`, ctx.peek().span);
    ctx.advance();
    synchronizeToTableStart(ctx);
  }

  return {
    file: makeSchemaFile({
      span: { start, end: ctx.peek().span.end },
      catalog: catalogToken.text,
      version: versionToken.text,
      tables,
    }),
    diagnostics: ctx.diagnostics,
  };
}
