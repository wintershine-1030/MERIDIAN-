import type { IrColumn, IrTable, ScalarType } from "../ir/types.js";
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

function emitColumn(column: IrColumn, dialect: Dialect): string {
  return `  ${dialect.quoteIdentifier(column.name)} ${dialect.mapType(column.type)}`;
}

export function emitCreateTable(table: IrTable, dialect: Dialect): string {
  const columnLines = table.columns.map((column) => emitColumn(column, dialect));
  return `CREATE TABLE ${dialect.quoteIdentifier(table.name)} (\n${columnLines.join(",\n")}\n);`;
}
