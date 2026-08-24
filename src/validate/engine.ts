import { createDiagnostic, type Diagnostic, type Severity } from "../errors/diagnostic.js";
import type { SchemaSpans } from "../ir/spans.js";
import type { IrSchema } from "../ir/types.js";
import { LineIndex, type Span } from "../util/span.js";

export interface RuleContext {
  readonly schema: IrSchema;
  readonly spans: SchemaSpans;
  report(code: string, message: string, severity: Severity, span: Span): void;
}

export type Rule = (ctx: RuleContext) => void;

export function runRules(
  rules: readonly Rule[],
  schema: IrSchema,
  spans: SchemaSpans,
  source: string,
  file: string,
): readonly Diagnostic[] {
  const lineIndex = new LineIndex(source);
  const diagnostics: Diagnostic[] = [];
  const ctx: RuleContext = {
    schema,
    spans,
    report(code, message, severity, span) {
      diagnostics.push(
        createDiagnostic({
          code,
          severity,
          message,
          file,
          start: lineIndex.positionAt(span.start),
          end: lineIndex.positionAt(span.end),
        }),
      );
    },
  };
  for (const rule of rules) {
    rule(ctx);
  }
  return diagnostics;
}
