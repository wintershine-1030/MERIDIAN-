import type { IrColumnReference, IrIndex, IrSchema } from "../ir/types.js";
import type { Change } from "./types.js";

function referencesEqual(before: IrColumnReference | null, after: IrColumnReference | null): boolean {
  if (before === null || after === null) {
    return before === after;
  }
  return before.table === after.table && before.column === after.column && before.onDelete === after.onDelete;
}

function indexKey(index: IrIndex): string {
  return `${index.unique}:${index.columns.join(",")}`;
}

export function diffColumnConstraints(before: IrSchema, after: IrSchema): Change[] {
  const changes: Change[] = [];
  const afterTables = new Map(after.tables.map((table) => [table.name, table]));

  for (const beforeTable of before.tables) {
    const afterTable = afterTables.get(beforeTable.name);
    if (afterTable === undefined) {
      continue;
    }

    const afterColumns = new Map(afterTable.columns.map((column) => [column.name, column]));

    for (const beforeColumn of beforeTable.columns) {
      const afterColumn = afterColumns.get(beforeColumn.name);
      if (afterColumn === undefined) {
        continue;
      }

      const table = beforeTable.name;
      const column = beforeColumn.name;

      if (beforeColumn.type !== afterColumn.type) {
        changes.push({ kind: "column_type_changed", table, column, before: beforeColumn.type, after: afterColumn.type });
      }
      if (beforeColumn.nullable !== afterColumn.nullable) {
        changes.push({
          kind: "column_nullable_changed",
          table,
          column,
          before: beforeColumn.nullable,
          after: afterColumn.nullable,
        });
      }
      if (beforeColumn.defaultValue !== afterColumn.defaultValue) {
        changes.push({
          kind: "column_default_changed",
          table,
          column,
          before: beforeColumn.defaultValue,
          after: afterColumn.defaultValue,
        });
      }
      if (beforeColumn.unique !== afterColumn.unique) {
        changes.push({ kind: "column_unique_changed", table, column, before: beforeColumn.unique, after: afterColumn.unique });
      }
      if (!referencesEqual(beforeColumn.references, afterColumn.references)) {
        changes.push({
          kind: "column_reference_changed",
          table,
          column,
          before: beforeColumn.references,
          after: afterColumn.references,
        });
      }
    }
  }

  return changes;
}

export function diffIndexes(before: IrSchema, after: IrSchema): Change[] {
  const changes: Change[] = [];
  const afterTables = new Map(after.tables.map((table) => [table.name, table]));

  for (const beforeTable of before.tables) {
    const afterTable = afterTables.get(beforeTable.name);
    if (afterTable === undefined) {
      continue;
    }

    const beforeIndexes = new Map(beforeTable.indexes.map((index) => [indexKey(index), index]));
    const afterIndexes = new Map(afterTable.indexes.map((index) => [indexKey(index), index]));

    for (const [key, index] of beforeIndexes) {
      if (!afterIndexes.has(key)) {
        changes.push({ kind: "index_removed", table: beforeTable.name, columns: index.columns, unique: index.unique });
      }
    }
    for (const [key, index] of afterIndexes) {
      if (!beforeIndexes.has(key)) {
        changes.push({ kind: "index_added", table: afterTable.name, columns: index.columns, unique: index.unique });
      }
    }
  }

  return changes;
}
