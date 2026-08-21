import type { ReferentialAction } from "../ast/nodes.js";

export type ScalarType = "uuid" | "text" | "int" | "bool";

export const SCALAR_TYPES: readonly ScalarType[] = ["uuid", "text", "int", "bool"];

export interface IrColumnReference {
  readonly table: string;
  readonly column: string;
  readonly onDelete: ReferentialAction | null;
}

export interface IrColumn {
  readonly name: string;
  readonly type: ScalarType;
  readonly nullable: boolean;
  readonly primaryKey: boolean;
  readonly unique: boolean;
  readonly references: IrColumnReference | null;
  readonly defaultValue: string | null;
}

export interface IrIndex {
  readonly columns: readonly string[];
  readonly unique: boolean;
}

export interface IrTable {
  readonly name: string;
  readonly columns: readonly IrColumn[];
  readonly indexes: readonly IrIndex[];
}

export interface IrSchema {
  readonly catalog: string;
  readonly version: string;
  readonly tables: readonly IrTable[];
}
