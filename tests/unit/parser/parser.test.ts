import { describe, expect, it } from "vitest";
import { lex } from "../../../src/lexer/scanner.js";
import { PARSE_UNEXPECTED_TOKEN } from "../../../src/parser/codes.js";
import { parseTable } from "../../../src/parser/parser.js";
import { LineIndex } from "../../../src/util/span.js";
import { readFixture } from "../../helpers/fixtures.js";

describe("parseTable over the parser-basic fixture", () => {
  it("parses columns with no diagnostics", () => {
    const source = readFixture("schemas/parser-basic.mrd");
    const { tokens } = lex(source, "parser-basic.mrd");
    const { table, diagnostics } = parseTable(tokens, source, "parser-basic.mrd");

    expect(diagnostics).toEqual([]);
    expect(table.name).toBe("users");
    expect(table.columns).toHaveLength(3);

    const [id, email, bio] = table.columns;
    expect(id?.name).toBe("id");
    expect(id?.type.name).toBe("uuid");
    expect(id?.type.nullable).toBe(false);

    expect(email?.name).toBe("email");
    expect(email?.type.name).toBe("text");
    expect(email?.type.nullable).toBe(false);

    expect(bio?.name).toBe("bio");
    expect(bio?.type.name).toBe("text");
    expect(bio?.type.nullable).toBe(true);
  });
});

describe("parseTable over the parser-recovery fixture", () => {
  it("reports the stray token once and keeps parsing the rest of the table", () => {
    const source = readFixture("schemas/parser-recovery.mrd");
    const { tokens } = lex(source, "parser-recovery.mrd");
    const { table, diagnostics } = parseTable(tokens, source, "parser-recovery.mrd");

    expect(diagnostics).toHaveLength(1);
    const [diagnostic] = diagnostics;
    expect(diagnostic?.code).toBe(PARSE_UNEXPECTED_TOKEN);

    const lineIndex = new LineIndex(source);
    const badTokenOffset = source.indexOf("42");
    expect(diagnostic?.start).toEqual(lineIndex.positionAt(badTokenOffset));

    expect(table.name).toBe("t");
    expect(table.columns).toHaveLength(2);
    expect(table.columns[0]?.name).toBe("id");
    expect(table.columns[1]?.name).toBe("name");
  });
});
