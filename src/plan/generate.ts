import type { ClassifiedChange } from "../diff/classify.js";
import type { Change } from "../diff/types.js";
import type { PlanStep } from "./types.js";

function buildStep(change: Change): PlanStep {
  switch (change.kind) {
    case "table_added":
      return { kind: "create_table", table: change.table, column: null, description: `create table '${change.table}'` };
    case "table_removed":
      return { kind: "drop_table", table: change.table, column: null, description: `drop table '${change.table}'` };
    case "column_added":
      return {
        kind: "add_column",
        table: change.table,
        column: change.column,
        description: `add column '${change.column}' to '${change.table}'`,
      };
    case "column_removed":
      return {
        kind: "drop_column",
        table: change.table,
        column: change.column,
        description: `drop column '${change.column}' from '${change.table}'`,
      };
    case "column_type_changed":
      return {
        kind: "alter_column_type",
        table: change.table,
        column: change.column,
        description: `alter type of column '${change.table}.${change.column}'`,
      };
    case "column_nullable_changed":
      return {
        kind: "alter_column_nullability",
        table: change.table,
        column: change.column,
        description: `alter nullability of column '${change.table}.${change.column}'`,
      };
    case "column_default_changed":
      return {
        kind: "alter_column_default",
        table: change.table,
        column: change.column,
        description: `alter default of column '${change.table}.${change.column}'`,
      };
    case "column_unique_changed":
      return {
        kind: "alter_column_uniqueness",
        table: change.table,
        column: change.column,
        description: `alter uniqueness of column '${change.table}.${change.column}'`,
      };
    case "column_reference_changed":
      return {
        kind: "alter_column_reference",
        table: change.table,
        column: change.column,
        description: `alter reference of column '${change.table}.${change.column}'`,
      };
    case "index_added":
      return {
        kind: "create_index",
        table: change.table,
        column: null,
        description: `create index on '${change.table}' (${change.columns.join(", ")})`,
      };
    case "index_removed":
      return {
        kind: "drop_index",
        table: change.table,
        column: null,
        description: `drop index on '${change.table}' (${change.columns.join(", ")})`,
      };
  }
}

export function generateSteps(classified: readonly ClassifiedChange[]): PlanStep[] {
  return classified.map((entry) => buildStep(entry.change));
}
