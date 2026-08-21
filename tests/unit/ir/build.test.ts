import { describe, expect, it } from "vitest";
import { IR_DUPLICATE_COLUMN, IR_DUPLICATE_TABLE, IR_UNKNOWN_TYPE } from "../../../src/ir/codes.js";
import { buildSchema, type BuildSchemaResult } from "../../../src/ir/build.js";
import { lex } from "../../../src/lexer/scanner.js";
import { parseSchemaFile } from "../../../src/parser/parser.js";
import { readFixture } from "../../helpers/fixtures.js";

function build(fixturePath: string): BuildSchemaResult {
  const source = readFixture(fixturePath);
  const { tokens } = lex(source, fixturePath);
  const { file, diagnostics: parseDiagnostics } = parseSchemaFile(tokens, source, fixturePath);
  expect(parseDiagnostics).toEqual([]);
  return buildSchema(file, source, fixturePath);
}

describe("buildSchema over the basic fixture", () => {
  it("normalizes and resolves every column with no diagnostics", () => {
    const { ir, diagnostics } = build("schemas/basic.mrd");
    expect(diagnostics).toEqual([]);
    expect(ir.catalog).toBe("catalog");
    expect(ir.version).toBe("v1");
    expect(ir.tables.map((t) => t.name)).toEqual(["posts", "users"]);

    const users = ir.tables.find((t) => t.name === "users");
    const emailColumn = users?.columns.find((c) => c.name === "email");
    expect(emailColumn?.type).toBe("text");
    expect(emailColumn?.nullable).toBe(false);

    const createdBy = users?.columns.find((c) => c.name === "created_by");
    expect(createdBy?.type).toBe("uuid");
    expect(createdBy?.nullable).toBe(true);
    expect(createdBy?.references).toEqual({ table: "users", column: "id", onDelete: "set null" });

    const display = users?.columns.find((c) => c.name === "display");
    expect(display?.defaultValue).toBe("anonymous");
  });
});

describe("buildSchema duplicate detection", () => {
  it("keeps the first table and first column, reporting a diagnostic for each duplicate", () => {
    const { ir, diagnostics } = build("schemas/ir-duplicates.mrd");

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.map((d) => d.code).sort()).toEqual([IR_DUPLICATE_COLUMN, IR_DUPLICATE_TABLE].sort());

    expect(ir.tables).toHaveLength(1);
    expect(ir.tables[0]?.name).toBe("users");
    expect(ir.tables[0]?.columns).toHaveLength(1);
    expect(ir.tables[0]?.columns[0]?.name).toBe("id");
    expect(ir.tables[0]?.columns[0]?.type).toBe("uuid");
  });
});

describe("buildSchema type resolution", () => {
  it("reports unknown scalar types and falls back to text", () => {
    const { ir, diagnostics } = build("schemas/ir-unknown-type.mrd");

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe(IR_UNKNOWN_TYPE);
    expect(ir.tables[0]?.columns[0]?.type).toBe("text");
  });
});

describe("buildSchema canonical ordering", () => {
  it("produces an identical ir for schemas that differ only in declaration order", () => {
    const a = build("schemas/canonical-a.mrd");
    const b = build("schemas/canonical-b.mrd");

    expect(a.diagnostics).toEqual([]);
    expect(b.diagnostics).toEqual([]);
    expect(a.ir).toEqual(b.ir);
  });
});
