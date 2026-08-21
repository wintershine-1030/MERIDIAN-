import type { ColumnDeclaration } from "../ast/nodes.js";
import type { Span } from "../util/span.js";
import { IR_UNKNOWN_TYPE } from "./codes.js";
import { SCALAR_TYPES, type IrColumn, type ScalarType } from "./types.js";

function resolveScalarType(name: string): ScalarType | null {
  return (SCALAR_TYPES as readonly string[]).includes(name) ? (name as ScalarType) : null;
}

export function resolveColumn(
  column: ColumnDeclaration,
  report: (code: string, message: string, span: Span) => void,
): IrColumn {
  const scalarType = resolveScalarType(column.type.name);
  if (scalarType === null) {
    report(IR_UNKNOWN_TYPE, `unknown type '${column.type.name}'`, column.type.span);
  }
  return {
    name: column.name,
    type: scalarType ?? "text",
    nullable: column.type.nullable,
    primaryKey: column.primaryKey,
    unique: column.unique,
    references:
      column.references === null
        ? null
        : {
            table: column.references.target.table,
            column: column.references.target.column,
            onDelete: column.references.onDelete,
          },
    defaultValue: column.default === null ? null : column.default.value.value,
  };
}
