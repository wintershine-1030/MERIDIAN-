import { VALIDATE_NULLABLE_PRIMARY_KEY, VALIDATE_UNIQUE_CONSTANT_DEFAULT } from "../codes.js";
import type { Rule } from "../engine.js";

export const nullabilityAndDefaultConsistencyRule: Rule = (ctx) => {
  for (const table of ctx.schema.tables) {
    for (const column of table.columns) {
      const columnSpan = ctx.spans.columns.get(`${table.name}.${column.name}`);
      if (columnSpan === undefined) {
        continue;
      }
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
    }
  }
};

export const CONSISTENCY_RULES: readonly Rule[] = [nullabilityAndDefaultConsistencyRule];
