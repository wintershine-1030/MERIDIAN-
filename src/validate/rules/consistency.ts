import { VALIDATE_NULLABLE_PRIMARY_KEY, VALIDATE_UNIQUE_CONSTANT_DEFAULT } from "../codes.js";
import type { Rule } from "../engine.js";
import { forEachColumn } from "../helpers.js";

export const nullabilityAndDefaultConsistencyRule: Rule = (ctx) => {
  forEachColumn(ctx, (table, column, columnSpan) => {
    if (column.primaryKey && column.nullable) {
      ctx.report(
        VALIDATE_NULLABLE_PRIMARY_KEY,
        `primary key column '${table.name}.${column.name}' must not be nullable`,
        "error",
        columnSpan,
      );
    }
    if (column.unique && column.defaultValue !== null) {
      ctx.report(
        VALIDATE_UNIQUE_CONSTANT_DEFAULT,
        `unique column '${table.name}.${column.name}' has a constant default; only one row can use it`,
        "warning",
        columnSpan,
      );
    }
  });
};

export const CONSISTENCY_RULES: readonly Rule[] = [nullabilityAndDefaultConsistencyRule];
