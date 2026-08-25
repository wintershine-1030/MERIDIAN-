import type { ScalarType } from "../ir/types.js";

export interface Dialect {
  readonly name: string;
  quoteIdentifier(name: string): string;
  mapType(type: ScalarType): string;
}
