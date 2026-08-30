export type StepKind =
  | "create_table"
  | "drop_table"
  | "add_column"
  | "drop_column"
  | "alter_column_type"
  | "alter_column_nullability"
  | "alter_column_default"
  | "alter_column_uniqueness"
  | "alter_column_reference"
  | "create_index"
  | "drop_index";

export interface PlanStep {
  readonly kind: StepKind;
  readonly table: string;
  readonly column: string | null;
  readonly description: string;
}
