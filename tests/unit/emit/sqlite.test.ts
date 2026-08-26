import { describe, expect, it } from "vitest";
import { emitSchema, sqliteDialect } from "../../../src/emit/sqlite.js";
import { buildSchema } from "../../../src/ir/build.js";
import { lex } from "../../../src/lexer/scanner.js";
import { parseSchemaFile } from "../../../src/parser/parser.js";
import { readFixture } from "../../helpers/fixtures.js";

function emit(fixturePath: string): string {
  const source = readFixture(fixturePath);
  const { tokens } = lex(source, fixturePath);
  const { file, diagnostics: parseDiagnostics } = parseSchemaFile(tokens, source, fixturePath);
  expect(parseDiagnostics).toEqual([]);
  const { ir, diagnostics: irDiagnostics } = buildSchema(file, source, fixturePath);
  expect(irDiagnostics).toEqual([]);
  return emitSchema(ir, sqliteDialect);
}

describe("emitSchema for sqlite", () => {
  it("emits a single simple table", () => {
    const output = emit("schemas/emit-widgets.mrd");
    const golden = readFixture("golden/sqlite/widgets.sql");
    expect(output).toBe(golden);
  });

  it("emits the full basic schema with dependency ordering, constraints and an index", () => {
    const output = emit("schemas/basic.mrd");
    const golden = readFixture("golden/sqlite/basic.sql");
    expect(output).toBe(golden);
  });
});
