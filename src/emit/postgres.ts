import type { ReferentialAction } from "../ast/nodes.js";
import type { IrColumn, IrIndex, IrTable, ScalarType } from "../ir/types.js";
import type { Dialect } from "./dialect.js";

const TYPE_MAP: Record<ScalarType, string> = {
  uuid: "uuid",
  text: "text",
  int: "integer",
  bool: "boolean",
};

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export const postgresDialect: Dialect = {
  name: "postgres",
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
