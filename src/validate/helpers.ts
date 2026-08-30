import type { IrColumn, IrTable } from "../ir/types.js";
import type { Span } from "../util/span.js";
import type { RuleContext } from "./engine.js";

export function forEachTable(ctx: RuleContext, callback: (table: IrTable, span: Span) => void): void {
  for (const table of ctx.schema.tables) {
    const span = ctx.spans.tables.get(table.name);
    if (span !== undefined) {
      callback(table, span);
    }
  }
}

export function forEachColumn(
  ctx: RuleContext,
  callback: (table: IrTable, column: IrColumn, span: Span) => void,
): void {
  for (const table of ctx.schema.tables) {
    for (const column of table.columns) {
      const span = ctx.spans.columns.get(`${table.name}.${column.name}`);
      if (span !== undefined) {
        callback(table, column, span);
      }
    }
  }
}
