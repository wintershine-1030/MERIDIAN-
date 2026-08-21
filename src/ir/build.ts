import type { ColumnDeclaration, SchemaFile, TableDeclaration } from "../ast/nodes.js";
import type { Span } from "../util/span.js";
import { IR_DUPLICATE_COLUMN, IR_DUPLICATE_TABLE } from "./codes.js";
import { SymbolTable } from "./symbols.js";

export function deduplicate(
  file: SchemaFile,
  report: (code: string, message: string, span: Span) => void,
): TableDeclaration[] {
  const symbols = new SymbolTable();
  const tables: TableDeclaration[] = [];
  for (const table of file.tables) {
    if (!symbols.addTable(table)) {
      report(IR_DUPLICATE_TABLE, `duplicate table '${table.name}'`, table.span);
      continue;
    }
    const columns: ColumnDeclaration[] = [];
    for (const column of table.columns) {
      if (!symbols.addColumn(table.name, column)) {
        report(IR_DUPLICATE_COLUMN, `duplicate column '${column.name}' in table '${table.name}'`, column.span);
        continue;
      }
      columns.push(column);
    }
    tables.push({ ...table, columns });
  }
  return tables;
}
