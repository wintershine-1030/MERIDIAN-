import type { Position } from "../util/span.js";

export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly file: string;
  readonly start: Position;
  readonly end: Position;
}

export function createDiagnostic(params: {
  code: string;
  severity: Severity;
  message: string;
  file: string;
  start: Position;
  end: Position;
}): Diagnostic {
  return { ...params };
}
