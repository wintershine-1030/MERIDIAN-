import {
  VALIDATE_UNKNOWN_INDEX_COLUMN,
  VALIDATE_UNKNOWN_REFERENCE_COLUMN,
  VALIDATE_UNKNOWN_REFERENCE_TABLE,
} from "../codes.js";
import type { Rule } from "../engine.js";
import { forEachColumn, forEachTable } from "../helpers.js";

export const referentialIntegrityRule: Rule = (ctx) => {
  const tablesByName = new Map(ctx.schema.tables.map((table) => [table.name, table]));

  forEachColumn(ctx, (table, column, columnSpan) => {
    const reference = column.references;
    if (reference === null) {
      return;
    }
    const targetTable = tablesByName.get(reference.table);
    if (targetTable === undefined) {
      ctx.report(
        VALIDATE_UNKNOWN_REFERENCE_TABLE,
        `column '${table.name}.${column.name}' references unknown table '${reference.table}'`,
        "error",
        columnSpan,
      );
      return;
    }
    const targetHasColumn = targetTable.columns.some((c) => c.name === reference.column);
    if (!targetHasColumn) {
      ctx.report(
        VALIDATE_UNKNOWN_REFERENCE_COLUMN,
        `column '${table.name}.${column.name}' references unknown column '${reference.table}.${reference.column}'`,
        "error",
        columnSpan,
      );
    }
  });

  forEachTable(ctx, (table, tableSpan) => {
    const columnNames = new Set(table.columns.map((c) => c.name));
    for (const index of table.indexes) {
      for (const indexColumn of index.columns) {
        if (!columnNames.has(indexColumn)) {
          ctx.report(
            VALIDATE_UNKNOWN_INDEX_COLUMN,
            `index on table '${table.name}' references unknown column '${indexColumn}'`,
            "error",
            tableSpan,
          );
        }
      }
    }
  });
};

export const REFERENTIAL_RULES: readonly Rule[] = [referentialIntegrityRule];
