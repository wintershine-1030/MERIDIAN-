import type { ColumnDeclaration, SchemaFile, TableDeclaration } from "../ast/nodes.js";
import { createDiagnostic, type Diagnostic } from "../errors/diagnostic.js";
import { LineIndex, type Span } from "../util/span.js";
import { canonicalizeSchema } from "./canonical.js";
import { IR_DUPLICATE_COLUMN, IR_DUPLICATE_TABLE } from "./codes.js";
import { resolveColumn } from "./resolve.js";
import type { SchemaSpans } from "./spans.js";
import { SymbolTable } from "./symbols.js";
import type { IrSchema, IrTable } from "./types.js";

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

export interface BuildSchemaResult {
  readonly ir: IrSchema;
  readonly diagnostics: readonly Diagnostic[];
  readonly spans: SchemaSpans;
}

export function buildSchema(file: SchemaFile, source: string, sourceFile: string): BuildSchemaResult {
  const lineIndex = new LineIndex(source);
  const diagnostics: Diagnostic[] = [];
  const report = (code: string, message: string, span: Span): void => {
    diagnostics.push(
      createDiagnostic({
        code,
        severity: "error",
        message,
        file: sourceFile,
        start: lineIndex.positionAt(span.start),
        end: lineIndex.positionAt(span.end),
      }),
    );
  };

  const dedupedTables = deduplicate(file, report);

  const tableSpans = new Map<string, Span>();
  const columnSpans = new Map<string, Span>();

  const tables: IrTable[] = dedupedTables.map((table) => {
    tableSpans.set(table.name, table.span);
    for (const column of table.columns) {
      columnSpans.set(`${table.name}.${column.name}`, column.span);
    }
    return {
      name: table.name,
      columns: table.columns.map((column) => resolveColumn(column, report)),
      indexes: table.indexes.map((index) => ({ columns: [...index.columns], unique: index.unique })),
    };
  });

  return {
    ir: canonicalizeSchema({ catalog: file.catalog, version: file.version, tables }),
    diagnostics,
    spans: { tables: tableSpans, columns: columnSpans },
  };
}
