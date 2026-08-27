import { describe, expect, it } from "vitest";
import { diagnosticsForChanges, diffSchemas } from "../../../src/diff/classify.js";
import { DIFF_BREAKING_CHANGE } from "../../../src/diff/codes.js";
import type { ChangeKind } from "../../../src/diff/types.js";
import { buildSchema } from "../../../src/ir/build.js";
import { lex } from "../../../src/lexer/scanner.js";
import { parseSchemaFile } from "../../../src/parser/parser.js";
import { readFixture } from "../../helpers/fixtures.js";

function build(fixturePath: string) {
  const source = readFixture(fixturePath);
  const { tokens } = lex(source, fixturePath);
  const { file, diagnostics: parseDiagnostics } = parseSchemaFile(tokens, source, fixturePath);
  expect(parseDiagnostics).toEqual([]);
  const { ir, diagnostics: irDiagnostics, spans } = buildSchema(file, source, fixturePath);
  expect(irDiagnostics).toEqual([]);
  return { ir, spans, source, file: fixturePath };
}

const ALL_KINDS: readonly ChangeKind[] = [
  "table_added",
  "table_removed",
  "column_added",
  "column_removed",
  "column_type_changed",
  "column_nullable_changed",
  "column_default_changed",
  "column_unique_changed",
  "column_reference_changed",
  "index_added",
  "index_removed",
];

describe("diffSchemas change matrix", () => {
  const before = build("schemas/diff-before.mrd");
  const after = build("schemas/diff-after.mrd");
  const classified = diffSchemas(before.ir, after.ir);

  it("covers every change kind in the taxonomy at least once", () => {
    const kinds = new Set(classified.map((entry) => entry.change.kind));
    expect(kinds).toEqual(new Set(ALL_KINDS));
  });

  it("classifies exactly 7 changes as breaking and 6 as compatible", () => {
    expect(classified.filter((entry) => entry.compatibility === "breaking")).toHaveLength(7);
    expect(classified.filter((entry) => entry.compatibility === "compatible")).toHaveLength(6);
  });

  it("produces the exact classified change matrix in deterministic order", () => {
    expect(classified).toEqual([
      { change: { kind: "table_added", table: "comments" }, compatibility: "compatible" },
      { change: { kind: "table_removed", table: "legacy_tokens" }, compatibility: "breaking" },
      { change: { kind: "column_added", table: "posts", column: "tags" }, compatibility: "compatible" },
      {
        change: { kind: "column_nullable_changed", table: "posts", column: "body", before: true, after: false },
        compatibility: "breaking",
      },
      {
        change: { kind: "column_nullable_changed", table: "posts", column: "title", before: false, after: true },
        compatibility: "compatible",
      },
      {
        change: {
          kind: "column_reference_changed",
          table: "posts",
          column: "author",
          before: { table: "users", column: "id", onDelete: "cascade" },
          after: { table: "users", column: "id", onDelete: "set null" },
        },
        compatibility: "breaking",
      },
      {
        change: { kind: "column_type_changed", table: "posts", column: "views", before: "int", after: "text" },
        compatibility: "breaking",
      },
      {
        change: { kind: "index_added", table: "posts", columns: ["author", "title"], unique: false },
        compatibility: "compatible",
      },
      {
        change: { kind: "index_removed", table: "posts", columns: ["author", "title"], unique: true },
        compatibility: "breaking",
      },
      { change: { kind: "column_added", table: "users", column: "last_login" }, compatibility: "compatible" },
      {
        change: { kind: "column_default_changed", table: "users", column: "email", before: null, after: "unknown" },
        compatibility: "compatible",
      },
      { change: { kind: "column_removed", table: "users", column: "display" }, compatibility: "breaking" },
      {
        change: { kind: "column_unique_changed", table: "users", column: "rank", before: false, after: true },
        compatibility: "breaking",
      },
    ]);
  });
});

describe("diagnosticsForChanges", () => {
  it("emits one MRD5001 diagnostic per breaking change, positioned in the correct source file", () => {
    const before = build("schemas/diff-before.mrd");
    const after = build("schemas/diff-after.mrd");
    const classified = diffSchemas(before.ir, after.ir);

    const diagnostics = diagnosticsForChanges(classified, before, after);

    expect(diagnostics).toHaveLength(7);
    for (const diagnostic of diagnostics) {
      expect(diagnostic.code).toBe(DIFF_BREAKING_CHANGE);
      expect(diagnostic.severity).toBe("error");
    }

    const removedTableDiagnostic = diagnostics.find((d) => d.message.includes("legacy_tokens"));
    expect(removedTableDiagnostic?.file).toBe("schemas/diff-before.mrd");

    const typeChangeDiagnostic = diagnostics.find((d) => d.message.includes("views"));
    expect(typeChangeDiagnostic?.file).toBe("schemas/diff-after.mrd");
  });
});
