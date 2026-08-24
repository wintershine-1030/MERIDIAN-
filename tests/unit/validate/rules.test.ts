import { describe, expect, it } from "vitest";
import { buildSchema } from "../../../src/ir/build.js";
import { lex } from "../../../src/lexer/scanner.js";
import { parseSchemaFile } from "../../../src/parser/parser.js";
import {
  VALIDATE_NAMING_CONVENTION,
  VALIDATE_NULLABLE_PRIMARY_KEY,
  VALIDATE_RESERVED_WORD,
  VALIDATE_UNIQUE_CONSTANT_DEFAULT,
  VALIDATE_UNKNOWN_INDEX_COLUMN,
  VALIDATE_UNKNOWN_REFERENCE_COLUMN,
  VALIDATE_UNKNOWN_REFERENCE_TABLE,
} from "../../../src/validate/codes.js";
import { runRules } from "../../../src/validate/engine.js";
import { ALL_RULES } from "../../../src/validate/registry.js";
import { readFixture } from "../../helpers/fixtures.js";

function validate(fixturePath: string) {
  const source = readFixture(fixturePath);
  const { tokens } = lex(source, fixturePath);
  const { file, diagnostics: parseDiagnostics } = parseSchemaFile(tokens, source, fixturePath);
  expect(parseDiagnostics).toEqual([]);
  const { ir, spans, diagnostics: irDiagnostics } = buildSchema(file, source, fixturePath);
  expect(irDiagnostics).toEqual([]);
  return runRules(ALL_RULES, ir, spans, source, fixturePath);
}

describe("validate over the basic fixture", () => {
  it("produces no diagnostics for a well-formed schema", () => {
    expect(validate("schemas/basic.mrd")).toEqual([]);
  });
});

describe("naming and reserved word rules", () => {
  it("flags a reserved word and a non-snake-case name separately", () => {
    const diagnostics = validate("schemas/validate-naming.mrd");
    expect(diagnostics.map((d) => d.code).sort()).toEqual([VALIDATE_RESERVED_WORD, VALIDATE_NAMING_CONVENTION].sort());
  });
});

describe("referential integrity rules", () => {
  it("flags an unknown reference table, an unknown reference column and an unknown index column", () => {
    const diagnostics = validate("schemas/validate-referential.mrd");
    expect(diagnostics.map((d) => d.code).sort()).toEqual(
      [VALIDATE_UNKNOWN_REFERENCE_TABLE, VALIDATE_UNKNOWN_REFERENCE_COLUMN, VALIDATE_UNKNOWN_INDEX_COLUMN].sort(),
    );
  });
});

describe("nullability and default consistency rules", () => {
  it("flags a nullable primary key and a unique column with a constant default", () => {
    const diagnostics = validate("schemas/validate-consistency.mrd");
    expect(diagnostics.map((d) => d.code).sort()).toEqual(
      [VALIDATE_NULLABLE_PRIMARY_KEY, VALIDATE_UNIQUE_CONSTANT_DEFAULT].sort(),
    );
  });
});
