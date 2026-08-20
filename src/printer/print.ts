import type {
  ColumnDeclaration,
  IndexDeclaration,
  ReferencesClause,
  SchemaFile,
  TableDeclaration,
  TypeReference,
} from "../ast/nodes.js";

function escapeStringLiteral(value: string): string {
  let result = "";
  for (const ch of value) {
    if (ch === "\\") {
      result += "\\\\";
    } else if (ch === '"') {
      result += '\\"';
    } else if (ch === "\n") {
      result += "\\n";
    } else if (ch === "\t") {
      result += "\\t";
    } else if (ch === "\r") {
      result += "\\r";
    } else {
      result += ch;
    }
  }
  return result;
}

function printType(type: TypeReference): string {
  return type.nullable ? `${type.name}?` : type.name;
}

function printReferences(clause: ReferencesClause): string {
  const base = `references ${clause.target.table}.${clause.target.column}`;
  return clause.onDelete === null ? base : `${base} on delete ${clause.onDelete}`;
}

function printColumn(column: ColumnDeclaration): string {
  const parts = [column.name, printType(column.type)];
  if (column.primaryKey) {
    parts.push("primary key");
  }
  if (column.unique) {
    parts.push("unique");
  }
  if (column.references !== null) {
    parts.push(printReferences(column.references));
  }
  if (column.default !== null) {
    parts.push(`default "${escapeStringLiteral(column.default.value.value)}"`);
  }
  return `  ${parts.join(" ")}`;
}

function printIndex(index: IndexDeclaration): string {
  const base = `  index (${index.columns.join(", ")})`;
  return index.unique ? `${base} unique` : base;
}

function printTable(table: TableDeclaration): string {
  const lines = [`table ${table.name} {`, ...table.columns.map(printColumn), ...table.indexes.map(printIndex), "}"];
  return lines.join("\n");
}

export function printSchemaFile(file: SchemaFile): string {
  const lines = [`schema ${file.catalog} ${file.version}`, "", ...file.tables.map(printTable)];
  return `${lines.join("\n")}\n`;
}
