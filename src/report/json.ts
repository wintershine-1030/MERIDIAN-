import type { Diagnostic } from "../errors/diagnostic.js";
import { sortedKeys } from "../util/sort.js";

function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of sortedKeys(obj)) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function toJsonDiagnostic(diagnostic: Diagnostic): Record<string, unknown> {
  return sortObjectKeys({
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    file: diagnostic.file,
    line: diagnostic.start.line,
    column: diagnostic.start.column,
  });
}

export function renderJson(diagnostics: readonly Diagnostic[], ok: boolean): string {
  const envelope = sortObjectKeys({
    version: 1,
    ok,
    diagnostics: diagnostics.map(toJsonDiagnostic),
  });
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
