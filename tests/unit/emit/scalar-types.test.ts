import { describe, expect, it } from "vitest";
import { emitSchema as emitPostgres, postgresDialect } from "../../../src/emit/postgres.js";
import { emitSchema as emitSqlite, sqliteDialect } from "../../../src/emit/sqlite.js";
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

describe("emitting every scalar type (uuid, text, int, bool)", () => {
  const ir = buildIr("schemas/all-scalar-types.mrd");

  it("resolves int and bool without falling back to text", () => {
    const types = new Map(ir.tables[0]!.columns.map((column) => [column.name, column.type]));
    expect(types.get("quantity")).toBe("int");
    expect(types.get("active")).toBe("bool");
  });

  it("emits postgres DDL matching the golden fixture", () => {
    expect(emitPostgres(ir, postgresDialect)).toBe(readFixture("golden/postgres/all-scalar-types.sql"));
  });

  it("emits sqlite DDL matching the golden fixture", () => {
    expect(emitSqlite(ir, sqliteDialect)).toBe(readFixture("golden/sqlite/all-scalar-types.sql"));
  });
});
