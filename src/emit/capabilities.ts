import { createDiagnostic, type Diagnostic } from "../errors/diagnostic.js";
import type { SchemaSpans } from "../ir/spans.js";
import type { IrSchema } from "../ir/types.js";
import { LineIndex } from "../util/span.js";
import { EMIT_UNSUPPORTED_FOREIGN_KEY_ACTIONS, EMIT_UNSUPPORTED_INDEXES } from "./codes.js";
import type { Dialect } from "./dialect.js";

export function checkCapabilities(
  schema: IrSchema,
  dialect: Dialect,
  spans: SchemaSpans,
  source: string,
  file: string,
): readonly Diagnostic[] {
  const lineIndex = new LineIndex(source);
  const diagnostics: Diagnostic[] = [];

  for (const table of schema.tables) {
    if (!dialect.capabilities.indexes && table.indexes.length > 0) {
      const tableSpan = spans.tables.get(table.name);
      if (tableSpan !== undefined) {
        diagnostics.push(
          createDiagnostic({
            code: EMIT_UNSUPPORTED_INDEXES,
            severity: "error",
            message: `dialect '${dialect.name}' does not support indexes, but table '${table.name}' declares one`,
            file,
            start: lineIndex.positionAt(tableSpan.start),
            end: lineIndex.positionAt(tableSpan.end),
          }),
        );
      }
    }

    if (!dialect.capabilities.foreignKeyActions) {
      for (const column of table.columns) {
        if (column.references !== null && column.references.onDelete !== null) {
          const columnSpan = spans.columns.get(`${table.name}.${column.name}`);
          if (columnSpan !== undefined) {
            diagnostics.push(
              createDiagnostic({
                code: EMIT_UNSUPPORTED_FOREIGN_KEY_ACTIONS,
                severity: "error",
                message: `dialect '${dialect.name}' does not support foreign key referential actions, but column '${table.name}.${column.name}' declares one`,
                file,
                start: lineIndex.positionAt(columnSpan.start),
                end: lineIndex.positionAt(columnSpan.end),
              }),
            );
          }
        }
      }
    }
  }

  return diagnostics;
}
