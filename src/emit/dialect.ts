import type { ScalarType } from "../ir/types.js";

export interface DialectCapabilities {
  readonly foreignKeyActions: boolean;
  readonly indexes: boolean;
}

export interface Dialect {
  readonly name: string;
  readonly capabilities: DialectCapabilities;
  quoteIdentifier(name: string): string;
  mapType(type: ScalarType): string;
}
