import type { IrSchema } from "../ir/types.js";
import type { Change } from "./types.js";

export function diffTables(before: IrSchema, after: IrSchema): Change[] {
  const changes: Change[] = [];
  const beforeNames = new Set(before.tables.map((table) => table.name));
  const afterNames = new Set(after.tables.map((table) => table.name));

  for (const table of before.tables) {
    if (!afterNames.has(table.name)) {
      changes.push({ kind: "table_removed", table: table.name });
    }
  }
  for (const table of after.tables) {
    if (!beforeNames.has(table.name)) {
      changes.push({ kind: "table_added", table: table.name });
    }
  }

  return changes;
}

export function diffColumns(before: IrSchema, after: IrSchema): Change[] {
  const changes: Change[] = [];
  const afterTables = new Map(after.tables.map((table) => [table.name, table]));

  for (const beforeTable of before.tables) {
    const afterTable = afterTables.get(beforeTable.name);
    if (afterTable === undefined) {
      continue;
    }

    const beforeColumnNames = new Set(beforeTable.columns.map((column) => column.name));
    const afterColumnNames = new Set(afterTable.columns.map((column) => column.name));

    for (const column of beforeTable.columns) {
      if (!afterColumnNames.has(column.name)) {
        changes.push({ kind: "column_removed", table: beforeTable.name, column: column.name });
      }
    }
    for (const column of afterTable.columns) {
      if (!beforeColumnNames.has(column.name)) {
        changes.push({ kind: "column_added", table: afterTable.name, column: column.name });
      }
    }
  }

  return changes;
}
