import type { Span } from "../util/span.js";

export interface SchemaSpans {
  readonly tables: ReadonlyMap<string, Span>;
  readonly columns: ReadonlyMap<string, Span>;
}
