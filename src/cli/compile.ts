import { createDiagnostic, type Diagnostic } from "../errors/diagnostic.js";
import { buildSchema } from "../ir/build.js";
import { canonicalizeSchema } from "../ir/canonical.js";
import { IR_CATALOG_MISMATCH, IR_DUPLICATE_TABLE } from "../ir/codes.js";
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

// A losing declaration in a cross-file duplicate-table conflict must not keep validating
// under its own file's spans: the merged schema no longer holds that file's version of the
// table (see the loop below), so span lookups for it would pair the WINNING file's table/
// column data with the LOSING file's source positions (or vice versa), producing diagnostics
// that are misattributed to the wrong file, wrong line, or simply don't describe what that
// file actually declares. Dropping the contested name from this file's own spans makes
// forEachTable/forEachColumn skip it cleanly instead of validating mismatched data.
function withoutTables(spans: SchemaSpans, excluded: ReadonlySet<string>): SchemaSpans {
  if (excluded.size === 0) {
    return spans;
  }
  return {
    tables: new Map([...spans.tables].filter(([name]) => !excluded.has(name))),
    columns: new Map(
      [...spans.columns].filter(([key]) => {
        const dot = key.indexOf(".");
        const tableName = dot === -1 ? key : key.slice(0, dot);
        return !excluded.has(tableName);
      }),
    ),
  };
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

    const lineIndex = new LineIndex(source);

    if (catalog === null) {
      catalog = ir.catalog;
      version = ir.version;
    } else if (ir.catalog !== catalog || ir.version !== version) {
      const point = lineIndex.positionAt(0);
      diagnostics.push(
        createDiagnostic({
          code: IR_CATALOG_MISMATCH,
          severity: "error",
          message: `schema '${ir.catalog} ${ir.version}' does not match catalog '${catalog} ${version}' declared by an earlier input file`,
          file,
          start: point,
          end: point,
        }),
      );
    }

    const duplicateTableNames = new Set<string>();
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
        duplicateTableNames.add(table.name);
        continue;
      }
      seenTableNames.add(table.name);
      mergedTables.push(table);
    }

    fileBuilds.push({ file, source, spans: withoutTables(spans, duplicateTableNames) });
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
