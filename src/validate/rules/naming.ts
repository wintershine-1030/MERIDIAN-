import type { Span } from "../../util/span.js";
import { VALIDATE_NAMING_CONVENTION, VALIDATE_RESERVED_WORD } from "../codes.js";
import type { Rule, RuleContext } from "../engine.js";

const RESERVED_WORDS = new Set([
  "select",
  "insert",
  "update",
  "delete",
  "from",
  "where",
  "table",
  "index",
  "primary",
  "key",
  "unique",
  "references",
  "default",
  "null",
  "not",
  "and",
  "or",
  "order",
  "group",
  "by",
  "join",
  "on",
  "as",
  "create",
  "drop",
  "alter",
  "into",
  "values",
  "set",
  "in",
  "is",
  "like",
  "between",
]);

const NAMING_PATTERN = /^[a-z][a-z0-9_]*$/;

function checkName(name: string, span: Span, ctx: RuleContext): void {
  if (RESERVED_WORDS.has(name.toLowerCase())) {
    ctx.report(VALIDATE_RESERVED_WORD, `'${name}' is a common SQL reserved word`, "warning", span);
  }
  if (!NAMING_PATTERN.test(name)) {
    ctx.report(VALIDATE_NAMING_CONVENTION, `'${name}' should be lowercase snake_case`, "warning", span);
  }
}

export const reservedAndNamingRule: Rule = (ctx) => {
  // Deliberately not routed through forEachTable/forEachColumn: those each make their own
  // full pass over ctx.schema.tables, which would check every table name before any column
  // name instead of a table together with its own columns. Diagnostic order is part of this
  // project's frozen, byte-for-byte output contract, so this walks table-then-its-columns in
  // one pass, same as before the helpers existed.
  for (const table of ctx.schema.tables) {
    const tableSpan = ctx.spans.tables.get(table.name);
    if (tableSpan !== undefined) {
      checkName(table.name, tableSpan, ctx);
    }
    for (const column of table.columns) {
      const columnSpan = ctx.spans.columns.get(`${table.name}.${column.name}`);
      if (columnSpan !== undefined) {
        checkName(column.name, columnSpan, ctx);
      }
    }
  }
};

export const NAMING_RULES: readonly Rule[] = [reservedAndNamingRule];
