import { describe, expect, it } from "vitest";
import { diffColumnConstraints, diffIndexes } from "../../../src/diff/constraints.js";
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

describe("diffColumnConstraints", () => {
  it("detects type, nullability, default, uniqueness and reference changes", () => {
    const before = buildIr("schemas/diff-before.mrd");
    const after = buildIr("schemas/diff-after.mrd");

    const changes = diffColumnConstraints(before, after);

    expect(changes).toHaveLength(6);
    expect(changes).toEqual(
      expect.arrayContaining([
        { kind: "column_type_changed", table: "posts", column: "views", before: "int", after: "text" },
        { kind: "column_nullable_changed", table: "posts", column: "title", before: false, after: true },
        { kind: "column_nullable_changed", table: "posts", column: "body", before: true, after: false },
        { kind: "column_unique_changed", table: "users", column: "rank", before: false, after: true },
        { kind: "column_default_changed", table: "users", column: "email", before: null, after: "unknown" },
        {
          kind: "column_reference_changed",
          table: "posts",
          column: "author",
          before: { table: "users", column: "id", onDelete: "cascade" },
          after: { table: "users", column: "id", onDelete: "set null" },
        },
      ]),
    );
  });

  it("reports nothing when comparing a schema to itself", () => {
    const schema = buildIr("schemas/diff-before.mrd");
    expect(diffColumnConstraints(schema, schema)).toEqual([]);
  });
});

describe("diffIndexes", () => {
  it("treats a uniqueness change on the same columns as a drop and recreate", () => {
    const before = buildIr("schemas/diff-before.mrd");
    const after = buildIr("schemas/diff-after.mrd");

    const changes = diffIndexes(before, after);

    expect(changes).toHaveLength(2);
    expect(changes).toEqual(
      expect.arrayContaining([
        { kind: "index_removed", table: "posts", columns: ["author", "title"], unique: true },
        { kind: "index_added", table: "posts", columns: ["author", "title"], unique: false },
      ]),
    );
  });

  it("reports nothing when comparing a schema to itself", () => {
    const schema = buildIr("schemas/diff-before.mrd");
    expect(diffIndexes(schema, schema)).toEqual([]);
  });
});
