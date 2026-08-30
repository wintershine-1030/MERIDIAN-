import type { Diagnostic } from "../errors/diagnostic.js";

function renderDiagnostic(diagnostic: Diagnostic): string {
  const location = `${diagnostic.file}:${diagnostic.start.line}:${diagnostic.start.column}`;
  return `${diagnostic.severity}[${diagnostic.code}]: ${diagnostic.message}\n  --> ${location}`;
}

export function renderHuman(diagnostics: readonly Diagnostic[]): string {
  if (diagnostics.length === 0) {
    return "";
  }
  return `${diagnostics.map(renderDiagnostic).join("\n\n")}\n`;
}
