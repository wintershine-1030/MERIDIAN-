import { createDiagnostic, type Diagnostic } from "../errors/diagnostic.js";
import { buildSchema } from "../ir/build.js";
import { canonicalizeSchema } from "../ir/canonical.js";
import { IR_DUPLICATE_TABLE } from "../ir/codes.js";
import type { SchemaSpans } from "../ir/spans.js";
import type { IrSchema, IrTable } from "../ir/types.js";
import { lex } from "../lexer/scanner.js";
import { parseSchemaFile } from "../parser/parser.js";
import { LineIndex } from "../util/span.js";
import { sortedKeys } from "../util/sort.js";
import type { Rule } from "../validate/engine.js";
import { runRules } from "../validate/engine.js";
import { ALL_RULES } from "../validate/registry.js";

export interface CompileOptions {
  readonly rules?: readonly Rule[];
  readonly strict?: boolean;
}

export interface CompileResult {
  readonly ok: boolean;
  readonly ir: IrSchema | null;
  readonly diagnostics: readonly Diagnostic[];
}

interface FileBuild {
  readonly file: string;
  readonly source: string;
  readonly spans: SchemaSpans;
}

export function compile(sources: Record<string, string>, options?: CompileOptions): CompileResult {
  const rules = options?.rules ?? ALL_RULES;
  const diagnostics: Diagnostic[] = [];
  const mergedTables: IrTable[] = [];
  const seenTableNames = new Set<string>();
  const fileBuilds: FileBuild[] = [];
  let catalog: string | null = null;
  let version = "";

  for (const file of sortedKeys(sources)) {
    const source = sources[file]!;
    const { tokens } = lex(source, file);
    const { file: parsedFile, diagnostics: parseDiagnostics } = parseSchemaFile(tokens, source, file);
    diagnostics.push(...parseDiagnostics);

    const { ir, diagnostics: irDiagnostics, spans } = buildSchema(parsedFile, source, file);
    diagnostics.push(...irDiagnostics);

    if (catalog === null) {
      catalog = ir.catalog;
      version = ir.version;
    }

    const lineIndex = new LineIndex(source);
    for (const table of ir.tables) {
      if (seenTableNames.has(table.name)) {
        const span = spans.tables.get(table.name);
        if (span !== undefined) {
          diagnostics.push(
            createDiagnostic({
              code: IR_DUPLICATE_TABLE,
              severity: "error",
              message: `duplicate table '${table.name}' across input files`,
              file,
              start: lineIndex.positionAt(span.start),
              end: lineIndex.positionAt(span.end),
            }),
          );
        }
        continue;
      }
      seenTableNames.add(table.name);
      mergedTables.push(table);
    }

    fileBuilds.push({ file, source, spans });
  }

  if (catalog === null) {
    return { ok: true, ir: null, diagnostics };
  }

  const mergedSchema = canonicalizeSchema({ catalog, version, tables: mergedTables });

  // Validate against the fully merged schema (so a reference from one file to a table
  // declared in another file resolves correctly), but with each file's own spans, so
  // every diagnostic still lands on the correct file and position, and each table's
  // own rules only fire once (span lookups for tables from other files simply miss).
  for (const fileBuild of fileBuilds) {
    diagnostics.push(...runRules(rules, mergedSchema, fileBuild.spans, fileBuild.source, fileBuild.file));
  }

  const failureSeverities: ReadonlySet<string> = options?.strict
    ? new Set(["error", "warning"])
    : new Set(["error"]);
  const ok = !diagnostics.some((diagnostic) => failureSeverities.has(diagnostic.severity));

  return { ok, ir: mergedSchema, diagnostics };
}
