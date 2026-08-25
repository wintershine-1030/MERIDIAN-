import type { ScalarType } from "../ir/types.js";
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
