import type { IrColumnReference, ScalarType } from "../ir/types.js";

export interface TableAdded {
  readonly kind: "table_added";
  readonly table: string;
}

export interface TableRemoved {
  readonly kind: "table_removed";
  readonly table: string;
}

export interface ColumnAdded {
  readonly kind: "column_added";
  readonly table: string;
  readonly column: string;
}

export interface ColumnRemoved {
  readonly kind: "column_removed";
  readonly table: string;
  readonly column: string;
}

export interface ColumnTypeChanged {
  readonly kind: "column_type_changed";
  readonly table: string;
  readonly column: string;
  readonly before: ScalarType;
  readonly after: ScalarType;
}

export interface ColumnNullableChanged {
  readonly kind: "column_nullable_changed";
  readonly table: string;
  readonly column: string;
  readonly before: boolean;
  readonly after: boolean;
}

export interface ColumnDefaultChanged {
  readonly kind: "column_default_changed";
  readonly table: string;
  readonly column: string;
  readonly before: string | null;
  readonly after: string | null;
}

export interface ColumnUniqueChanged {
  readonly kind: "column_unique_changed";
  readonly table: string;
  readonly column: string;
  readonly before: boolean;
  readonly after: boolean;
}

export interface ColumnReferenceChanged {
  readonly kind: "column_reference_changed";
  readonly table: string;
  readonly column: string;
  readonly before: IrColumnReference | null;
  readonly after: IrColumnReference | null;
}

export interface IndexAdded {
  readonly kind: "index_added";
  readonly table: string;
  readonly columns: readonly string[];
  readonly unique: boolean;
}

export interface IndexRemoved {
  readonly kind: "index_removed";
  readonly table: string;
  readonly columns: readonly string[];
  readonly unique: boolean;
}

export type Change =
  | TableAdded
  | TableRemoved
  | ColumnAdded
  | ColumnRemoved
  | ColumnTypeChanged
  | ColumnNullableChanged
  | ColumnDefaultChanged
  | ColumnUniqueChanged
  | ColumnReferenceChanged
  | IndexAdded
  | IndexRemoved;

export type ChangeKind = Change["kind"];
