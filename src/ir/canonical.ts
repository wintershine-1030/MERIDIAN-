import { compareStrings, stableSortBy } from "../util/sort.js";
import type { IrIndex, IrSchema, IrTable } from "./types.js";

function canonicalizeIndex(index: IrIndex): IrIndex {
  return { columns: [...index.columns].sort(compareStrings), unique: index.unique };
}

function canonicalizeTable(table: IrTable): IrTable {
  return {
    name: table.name,
    columns: stableSortBy(table.columns, (column) => column.name),
    indexes: stableSortBy(table.indexes.map(canonicalizeIndex), (index) => `${index.columns.join(",")}:${index.unique}`),
  };
}

export function canonicalizeSchema(schema: IrSchema): IrSchema {
  return {
    catalog: schema.catalog,
    version: schema.version,
    tables: stableSortBy(schema.tables.map(canonicalizeTable), (table) => table.name),
  };
}
