import { describe, expect, it } from "vitest";
import { lex } from "../../../src/lexer/scanner.js";
import { PARSE_UNEXPECTED_TOKEN } from "../../../src/parser/codes.js";
import { parseSchemaFile } from "../../../src/parser/parser.js";
import { printSchemaFile } from "../../../src/printer/print.js";
import { LineIndex } from "../../../src/util/span.js";
import { readFixture } from "../../helpers/fixtures.js";

function stripSpans(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripSpans);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === "span") {
        continue;
      }
      result[key] = stripSpans(val);
    }
    return result;
  }
  return value;
}

describe("round trip over the basic fixture", () => {
  it("parses with no diagnostics and print-then-reparse produces an equivalent tree", () => {
    const source = readFixture("schemas/basic.mrd");
    const { tokens } = lex(source, "basic.mrd");
    const { file, diagnostics } = parseSchemaFile(tokens, source, "basic.mrd");
    expect(diagnostics).toEqual([]);

    const printed = printSchemaFile(file);
    const { tokens: reprintedTokens } = lex(printed, "basic.mrd");
    const { file: reparsed, diagnostics: reparsedDiagnostics } = parseSchemaFile(
      reprintedTokens,
      printed,
      "basic.mrd",
    );

    expect(reparsedDiagnostics).toEqual([]);
    expect(stripSpans(reparsed)).toEqual(stripSpans(file));
  });
});

describe("diagnostic ordering across multiple tables", () => {
  it("reports diagnostics from each table in source order", () => {
    const source = readFixture("schemas/multi-table-errors.mrd");
    const { tokens } = lex(source, "multi-table-errors.mrd");
    const { file, diagnostics } = parseSchemaFile(tokens, source, "multi-table-errors.mrd");

    expect(diagnostics).toHaveLength(2);
    const [first, second] = diagnostics;
    expect(first?.code).toBe(PARSE_UNEXPECTED_TOKEN);
    expect(second?.code).toBe(PARSE_UNEXPECTED_TOKEN);

    const lineIndex = new LineIndex(source);
    expect(first?.start).toEqual(lineIndex.positionAt(source.indexOf("\n  1\n") + 3));
    expect(second?.start).toEqual(lineIndex.positionAt(source.indexOf("\n  2\n") + 3));

    expect(file.tables).toHaveLength(2);
    expect(file.tables[0]?.name).toBe("a");
    expect(file.tables[0]?.columns.map((c) => c.name)).toEqual(["id", "name"]);
    expect(file.tables[1]?.name).toBe("b");
    expect(file.tables[1]?.columns.map((c) => c.name)).toEqual(["id", "name"]);
  });
});
