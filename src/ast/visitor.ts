import type { ColumnDeclaration, IndexDeclaration, SchemaFile, TableDeclaration } from "./nodes.js";

export interface Visitor {
  readonly SchemaFile?: (node: SchemaFile) => void;
  readonly TableDeclaration?: (node: TableDeclaration) => void;
  readonly ColumnDeclaration?: (node: ColumnDeclaration) => void;
  readonly IndexDeclaration?: (node: IndexDeclaration) => void;
}

export function visitSchemaFile(file: SchemaFile, visitor: Visitor): void {
  visitor.SchemaFile?.(file);
  for (const table of file.tables) {
    visitTableDeclaration(table, visitor);
  }
}

export function visitTableDeclaration(table: TableDeclaration, visitor: Visitor): void {
  visitor.TableDeclaration?.(table);
  for (const column of table.columns) {
    visitor.ColumnDeclaration?.(column);
  }
  for (const index of table.indexes) {
    visitor.IndexDeclaration?.(index);
  }
}
