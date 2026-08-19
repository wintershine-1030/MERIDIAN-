import type {
  ColumnDeclaration,
  ColumnReference,
  DefaultClause,
  IndexDeclaration,
  ReferencesClause,
  SchemaFile,
  StringLiteral,
  TableDeclaration,
  TypeReference,
} from "./nodes.js";

export function stringLiteral(params: Omit<StringLiteral, "kind">): StringLiteral {
  return { kind: "StringLiteral", ...params };
}

export function typeReference(params: Omit<TypeReference, "kind">): TypeReference {
  return { kind: "TypeReference", ...params };
}

export function columnReference(params: Omit<ColumnReference, "kind">): ColumnReference {
  return { kind: "ColumnReference", ...params };
}

export function referencesClause(params: Omit<ReferencesClause, "kind">): ReferencesClause {
  return { kind: "ReferencesClause", ...params };
}

export function defaultClause(params: Omit<DefaultClause, "kind">): DefaultClause {
  return { kind: "DefaultClause", ...params };
}

export function columnDeclaration(params: Omit<ColumnDeclaration, "kind">): ColumnDeclaration {
  return { kind: "ColumnDeclaration", ...params };
}

export function indexDeclaration(params: Omit<IndexDeclaration, "kind">): IndexDeclaration {
  return { kind: "IndexDeclaration", ...params };
}

export function tableDeclaration(params: Omit<TableDeclaration, "kind">): TableDeclaration {
  return { kind: "TableDeclaration", ...params };
}

export function schemaFile(params: Omit<SchemaFile, "kind">): SchemaFile {
  return { kind: "SchemaFile", ...params };
}
