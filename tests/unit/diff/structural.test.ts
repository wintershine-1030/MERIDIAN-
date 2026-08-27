import { describe, expect, it } from "vitest";
import { diffColumns, diffTables } from "../../../src/diff/structural.js";
import { buildSchema } from "../../../src/ir/build.js";
import { lex } from "../../../src/lexer/scanner.js";
import { parseSchemaFile } from "../../../src/parser/parser.js";
import { readFixture } from "../../helpers/fixtures.js";

function buildIr(fixturePath: string) {
  const source = readFixture(fixturePath);
  const { tokens } = lex(source, fixturePath);
  const { file, diagnostics: parseDiagnostics } = parseSchemaFile(tokens, source, fixturePath);
  expect(parseDiagnostics).toEqual([]);
  const { ir, diagnostics: irDiagnostics } = buildSchema(file, source, fixturePath);
  expect(irDiagnostics).toEqual([]);
  return ir;
}

describe("diffTables", () => {
  it("detects added and removed tables between schema versions", () => {
    const before = buildIr("schemas/diff-before.mrd");
    const after = buildIr("schemas/diff-after.mrd");

    const changes = diffTables(before, after);

    expect(changes).toHaveLength(2);
    expect(changes).toEqual(
      expect.arrayContaining([
        { kind: "table_added", table: "comments" },
        { kind: "table_removed", table: "legacy_tokens" },
      ]),
    );
  });

  it("reports nothing when comparing a schema to itself", () => {
    const schema = buildIr("schemas/diff-before.mrd");
    expect(diffTables(schema, schema)).toEqual([]);
  });
});

describe("diffColumns", () => {
  it("detects added and removed columns on tables present in both versions", () => {
    const before = buildIr("schemas/diff-before.mrd");
    const after = buildIr("schemas/diff-after.mrd");

    const changes = diffColumns(before, after);

    expect(changes).toHaveLength(3);
    expect(changes).toEqual(
      expect.arrayContaining([
        { kind: "column_removed", table: "users", column: "display" },
        { kind: "column_added", table: "users", column: "last_login" },
        { kind: "column_added", table: "posts", column: "tags" },
      ]),
    );
  });

  it("does not report columns of a table that was itself added or removed", () => {
    const before = buildIr("schemas/diff-before.mrd");
    const after = buildIr("schemas/diff-after.mrd");

    const changes = diffColumns(before, after);

    expect(changes.some((change) => change.table === "comments")).toBe(false);
    expect(changes.some((change) => change.table === "legacy_tokens")).toBe(false);
  });

  it("reports nothing when comparing a schema to itself", () => {
    const schema = buildIr("schemas/diff-before.mrd");
    expect(diffColumns(schema, schema)).toEqual([]);
  });
});
