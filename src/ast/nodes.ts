import type { Span } from "../util/span.js";

export interface StringLiteral {
  readonly kind: "StringLiteral";
  readonly span: Span;
  readonly value: string;
}

export type Literal = StringLiteral;

export interface TypeReference {
  readonly kind: "TypeReference";
  readonly span: Span;
  readonly name: string;
  readonly nullable: boolean;
}

export interface ColumnReference {
  readonly kind: "ColumnReference";
  readonly span: Span;
  readonly table: string;
  readonly column: string;
}

export type ReferentialAction = "cascade" | "restrict" | "set null" | "set default" | "no action";

export interface ReferencesClause {
  readonly kind: "ReferencesClause";
  readonly span: Span;
  readonly target: ColumnReference;
  readonly onDelete: ReferentialAction | null;
}

export interface DefaultClause {
  readonly kind: "DefaultClause";
  readonly span: Span;
  readonly value: Literal;
}

export interface ColumnDeclaration {
  readonly kind: "ColumnDeclaration";
  readonly span: Span;
  readonly name: string;
  readonly type: TypeReference;
  readonly primaryKey: boolean;
  readonly notNull: boolean;
  readonly unique: boolean;
  readonly references: ReferencesClause | null;
  readonly default: DefaultClause | null;
}

export interface IndexDeclaration {
  readonly kind: "IndexDeclaration";
  readonly span: Span;
  readonly columns: readonly string[];
  readonly unique: boolean;
}

export interface TableDeclaration {
  readonly kind: "TableDeclaration";
  readonly span: Span;
  readonly name: string;
  readonly columns: readonly ColumnDeclaration[];
  readonly indexes: readonly IndexDeclaration[];
}

export interface SchemaFile {
  readonly kind: "SchemaFile";
  readonly span: Span;
  readonly catalog: string;
  readonly version: string;
  readonly tables: readonly TableDeclaration[];
}

export type AstNode =
  | SchemaFile
  | TableDeclaration
  | ColumnDeclaration
  | IndexDeclaration
  | TypeReference
  | ReferencesClause
  | ColumnReference
  | DefaultClause
  | StringLiteral;
