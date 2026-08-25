import { describe, expect, it } from "vitest";
import { emitSchema, postgresDialect } from "../../../src/emit/postgres.js";
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
  return emitSchema(ir, postgresDialect);
}

describe("emitSchema for postgres", () => {
  it("emits a single simple table", () => {
    const output = emit("schemas/emit-widgets.mrd");
    const golden = readFixture("golden/postgres/widgets.sql");
    expect(output).toBe(golden);
  });

  it("emits the full basic schema with dependency ordering, constraints and an index", () => {
    const output = emit("schemas/basic.mrd");
    const golden = readFixture("golden/postgres/basic.sql");
    expect(output).toBe(golden);
  });
});
