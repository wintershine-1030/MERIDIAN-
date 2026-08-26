import type { ReferentialAction } from "../ast/nodes.js";
import type { IrColumn, IrIndex, IrSchema, IrTable, ScalarType } from "../ir/types.js";
import { compareStrings } from "../util/sort.js";
import type { Dialect } from "./dialect.js";

const TYPE_MAP: Record<ScalarType, string> = {
  uuid: "TEXT",
  text: "TEXT",
  int: "INTEGER",
  bool: "INTEGER",
};

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export const sqliteDialect: Dialect = {
  name: "sqlite",
  capabilities: { foreignKeyActions: true, indexes: true },
  quoteIdentifier,
  mapType: (type) => TYPE_MAP[type],
};

function formatDefault(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function formatReferentialAction(action: ReferentialAction): string {
  return action.toUpperCase();
}

function emitColumn(column: IrColumn, dialect: Dialect): string {
  const parts = [dialect.quoteIdentifier(column.name), dialect.mapType(column.type)];
  if (!column.nullable && !column.primaryKey) {
    parts.push("NOT NULL");
  }
  if (column.primaryKey) {
    parts.push("PRIMARY KEY");
  }
  if (column.unique) {
    parts.push("UNIQUE");
  }
  if (column.references !== null) {
    const reference = column.references;
    let referenceText = `REFERENCES ${dialect.quoteIdentifier(reference.table)} (${dialect.quoteIdentifier(reference.column)})`;
    if (reference.onDelete !== null) {
      referenceText += ` ON DELETE ${formatReferentialAction(reference.onDelete)}`;
    }
    parts.push(referenceText);
  }
  if (column.defaultValue !== null) {
    parts.push(`DEFAULT ${formatDefault(column.defaultValue)}`);
  }
  return `  ${parts.join(" ")}`;
}

export function emitCreateTable(table: IrTable, dialect: Dialect): string {
  const columnLines = table.columns.map((column) => emitColumn(column, dialect));
  return `CREATE TABLE ${dialect.quoteIdentifier(table.name)} (\n${columnLines.join(",\n")}\n);`;
}

function indexName(table: string, index: IrIndex): string {
  return [table, ...index.columns, "idx"].join("_");
}

export function emitIndex(table: IrTable, index: IrIndex, dialect: Dialect): string {
  const keyword = index.unique ? "CREATE UNIQUE INDEX" : "CREATE INDEX";
  const columns = index.columns.map((column) => dialect.quoteIdentifier(column)).join(", ");
  return `${keyword} ${dialect.quoteIdentifier(indexName(table.name, index))} ON ${dialect.quoteIdentifier(table.name)} (${columns});`;
}

function orderTables(tables: readonly IrTable[]): readonly IrTable[] {
  const byName = new Map(tables.map((table) => [table.name, table]));
  const dependsOn = new Map<string, Set<string>>();
  for (const table of tables) {
    const deps = new Set<string>();
    for (const column of table.columns) {
      if (
        column.references !== null &&
        column.references.table !== table.name &&
        byName.has(column.references.table)
      ) {
        deps.add(column.references.table);
      }
    }
    dependsOn.set(table.name, deps);
  }

  const remaining = new Set(tables.map((table) => table.name));
  const ordered: IrTable[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((name) => [...(dependsOn.get(name) ?? [])].every((dep) => !remaining.has(dep)))
      .sort(compareStrings);
    if (ready.length === 0) {
      for (const name of [...remaining].sort(compareStrings)) {
        ordered.push(byName.get(name)!);
      }
      break;
    }
    for (const name of ready) {
      ordered.push(byName.get(name)!);
      remaining.delete(name);
    }
  }

  return ordered;
}

export function emitSchema(schema: IrSchema, dialect: Dialect): string {
  const orderedTables = orderTables(schema.tables);
  const statements: string[] = [];
  for (const table of orderedTables) {
    statements.push(emitCreateTable(table, dialect));
    for (const index of table.indexes) {
      statements.push(emitIndex(table, index, dialect));
    }
  }
  return `${statements.join("\n\n")}\n`;
}
