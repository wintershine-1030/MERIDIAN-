import { createDiagnostic, type Diagnostic } from "../errors/diagnostic.js";
import type { SchemaSpans } from "../ir/spans.js";
import type { IrColumnReference, IrSchema } from "../ir/types.js";
import { LineIndex, type Span } from "../util/span.js";
import { stableSortBy } from "../util/sort.js";
import { DIFF_BREAKING_CHANGE } from "./codes.js";
import { diffColumnConstraints, diffIndexes } from "./constraints.js";
import { diffColumns, diffTables } from "./structural.js";
import type { Change } from "./types.js";

export type Compatibility = "compatible" | "breaking";

export interface ClassifiedChange {
  readonly change: Change;
  readonly compatibility: Compatibility;
}

export function classifyChange(change: Change): Compatibility {
  switch (change.kind) {
    case "table_added":
    case "column_added":
    case "index_added":
    case "column_default_changed":
      return "compatible";
    case "table_removed":
    case "column_removed":
    case "index_removed":
    case "column_type_changed":
    case "column_reference_changed":
      return "breaking";
    case "column_nullable_changed":
      return change.after ? "compatible" : "breaking";
    case "column_unique_changed":
      return change.after ? "breaking" : "compatible";
  }
}

function changeSortKey(change: Change): string {
  const detail = "column" in change ? change.column : "columns" in change ? change.columns.join(",") : "";
  return `${change.table} ${change.kind} ${detail}`;
}

export function classifyChanges(changes: readonly Change[]): ClassifiedChange[] {
  return stableSortBy(changes, changeSortKey).map((change) => ({ change, compatibility: classifyChange(change) }));
}

export function diffSchemas(before: IrSchema, after: IrSchema): ClassifiedChange[] {
  const changes = [
    ...diffTables(before, after),
    ...diffColumns(before, after),
    ...diffColumnConstraints(before, after),
    ...diffIndexes(before, after),
  ];
  return classifyChanges(changes);
}

function formatDefault(value: string | null): string {
  return value === null ? "none" : `'${value}'`;
}

function formatReference(reference: IrColumnReference | null): string {
  if (reference === null) {
    return "none";
  }
  return reference.onDelete === null
    ? `${reference.table}.${reference.column}`
    : `${reference.table}.${reference.column} (on delete ${reference.onDelete})`;
}

export function describeChange(change: Change): string {
  switch (change.kind) {
    case "table_added":
      return `table '${change.table}' was added`;
    case "table_removed":
      return `table '${change.table}' was removed`;
    case "column_added":
      return `column '${change.table}.${change.column}' was added`;
    case "column_removed":
      return `column '${change.table}.${change.column}' was removed`;
    case "column_type_changed":
      return `column '${change.table}.${change.column}' type changed from '${change.before}' to '${change.after}'`;
    case "column_nullable_changed":
      return change.after
        ? `column '${change.table}.${change.column}' became nullable`
        : `column '${change.table}.${change.column}' is no longer nullable`;
    case "column_default_changed":
      return `column '${change.table}.${change.column}' default changed from ${formatDefault(change.before)} to ${formatDefault(change.after)}`;
    case "column_unique_changed":
      return change.after
        ? `column '${change.table}.${change.column}' became unique`
        : `column '${change.table}.${change.column}' is no longer unique`;
    case "column_reference_changed":
      return `column '${change.table}.${change.column}' reference changed from ${formatReference(change.before)} to ${formatReference(change.after)}`;
    case "index_added":
      return `index on '${change.table}' (${change.columns.join(", ")}) was added`;
    case "index_removed":
      return `index on '${change.table}' (${change.columns.join(", ")}) was removed`;
  }
}

export interface SchemaContext {
  readonly spans: SchemaSpans;
  readonly source: string;
  readonly file: string;
}

function locate(change: Change, before: SchemaContext, after: SchemaContext): { span: Span; ctx: SchemaContext } | undefined {
  switch (change.kind) {
    case "table_added": {
      const span = after.spans.tables.get(change.table);
      return span === undefined ? undefined : { span, ctx: after };
    }
    case "table_removed": {
      const span = before.spans.tables.get(change.table);
      return span === undefined ? undefined : { span, ctx: before };
    }
    case "index_added": {
      const span = after.spans.tables.get(change.table);
      return span === undefined ? undefined : { span, ctx: after };
    }
    case "index_removed": {
      const span = before.spans.tables.get(change.table);
      return span === undefined ? undefined : { span, ctx: before };
    }
    case "column_added": {
      const span = after.spans.columns.get(`${change.table}.${change.column}`);
      return span === undefined ? undefined : { span, ctx: after };
    }
    case "column_removed": {
      const span = before.spans.columns.get(`${change.table}.${change.column}`);
      return span === undefined ? undefined : { span, ctx: before };
    }
    case "column_type_changed":
    case "column_nullable_changed":
    case "column_default_changed":
    case "column_unique_changed":
    case "column_reference_changed": {
      const span = after.spans.columns.get(`${change.table}.${change.column}`);
      return span === undefined ? undefined : { span, ctx: after };
    }
  }
}

export function diagnosticsForChanges(
  classified: readonly ClassifiedChange[],
  before: SchemaContext,
  after: SchemaContext,
): readonly Diagnostic[] {
  const beforeLineIndex = new LineIndex(before.source);
  const afterLineIndex = new LineIndex(after.source);
  const diagnostics: Diagnostic[] = [];

  for (const entry of classified) {
    if (entry.compatibility !== "breaking") {
      continue;
    }
    const located = locate(entry.change, before, after);
    if (located === undefined) {
      continue;
    }
    const lineIndex = located.ctx === before ? beforeLineIndex : afterLineIndex;
    diagnostics.push(
      createDiagnostic({
        code: DIFF_BREAKING_CHANGE,
        severity: "error",
        message: describeChange(entry.change),
        file: located.ctx.file,
        start: lineIndex.positionAt(located.span.start),
        end: lineIndex.positionAt(located.span.end),
      }),
    );
  }

  return diagnostics;
}
