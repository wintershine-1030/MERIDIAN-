import { describe, expect, it } from "vitest";
import { diffSchemas } from "../../../src/diff/classify.js";
import { generateSteps } from "../../../src/plan/generate.js";
import type { StepKind } from "../../../src/plan/types.js";
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

const ALL_STEP_KINDS: readonly StepKind[] = [
  "create_table",
  "drop_table",
  "add_column",
  "drop_column",
  "alter_column_type",
  "alter_column_nullability",
  "alter_column_default",
  "alter_column_uniqueness",
  "alter_column_reference",
  "create_index",
  "drop_index",
];

describe("generateSteps", () => {
  const before = buildIr("schemas/diff-before.mrd");
  const after = buildIr("schemas/diff-after.mrd");
  const classified = diffSchemas(before, after);
  const steps = generateSteps(classified);

  it("produces one step per classified change, in the same order", () => {
    expect(steps).toHaveLength(classified.length);
  });

  it("covers every step kind in the taxonomy at least once", () => {
    expect(new Set(steps.map((step) => step.kind))).toEqual(new Set(ALL_STEP_KINDS));
  });

  it("produces the exact step list in declaration order, matching the diff's deterministic order", () => {
    expect(steps).toEqual([
      { kind: "create_table", table: "comments", column: null, description: "create table 'comments'" },
      { kind: "drop_table", table: "legacy_tokens", column: null, description: "drop table 'legacy_tokens'" },
      { kind: "add_column", table: "posts", column: "tags", description: "add column 'tags' to 'posts'" },
      {
        kind: "alter_column_nullability",
        table: "posts",
        column: "body",
        description: "alter nullability of column 'posts.body'",
      },
      {
        kind: "alter_column_nullability",
        table: "posts",
        column: "title",
        description: "alter nullability of column 'posts.title'",
      },
      {
        kind: "alter_column_reference",
        table: "posts",
        column: "author",
        description: "alter reference of column 'posts.author'",
      },
      {
        kind: "alter_column_type",
        table: "posts",
        column: "views",
        description: "alter type of column 'posts.views'",
      },
      {
        kind: "create_index",
        table: "posts",
        column: null,
        description: "create index on 'posts' (author, title)",
      },
      {
        kind: "drop_index",
        table: "posts",
        column: null,
        description: "drop index on 'posts' (author, title)",
      },
      { kind: "add_column", table: "users", column: "last_login", description: "add column 'last_login' to 'users'" },
      {
        kind: "alter_column_default",
        table: "users",
        column: "email",
        description: "alter default of column 'users.email'",
      },
      { kind: "drop_column", table: "users", column: "display", description: "drop column 'display' from 'users'" },
      {
        kind: "alter_column_uniqueness",
        table: "users",
        column: "rank",
        description: "alter uniqueness of column 'users.rank'",
      },
    ]);
  });
});
