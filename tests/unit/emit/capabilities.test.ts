import { describe, expect, it } from "vitest";
import { checkCapabilities } from "../../../src/emit/capabilities.js";
import { EMIT_UNSUPPORTED_FOREIGN_KEY_ACTIONS, EMIT_UNSUPPORTED_INDEXES } from "../../../src/emit/codes.js";
import type { Dialect } from "../../../src/emit/dialect.js";
import { postgresDialect } from "../../../src/emit/postgres.js";
import { buildSchema } from "../../../src/ir/build.js";
import { lex } from "../../../src/lexer/scanner.js";
import { parseSchemaFile } from "../../../src/parser/parser.js";
import { readFixture } from "../../helpers/fixtures.js";

function buildBasicSchema() {
  const source = readFixture("schemas/basic.mrd");
  const { tokens } = lex(source, "basic.mrd");
  const { file } = parseSchemaFile(tokens, source, "basic.mrd");
  const { ir, spans } = buildSchema(file, source, "basic.mrd");
  return { ir, spans, source };
}

describe("checkCapabilities", () => {
  it("reports nothing for a dialect that supports everything the schema uses", () => {
    const { ir, spans, source } = buildBasicSchema();
    const diagnostics = checkCapabilities(ir, postgresDialect, spans, source, "basic.mrd");
    expect(diagnostics).toEqual([]);
  });

  it("reports unsupported foreign key actions and unsupported indexes for a limited dialect", () => {
    const { ir, spans, source } = buildBasicSchema();
    const limitedDialect: Dialect = {
      name: "limited",
      capabilities: { foreignKeyActions: false, indexes: false },
      quoteIdentifier: (name) => `"${name}"`,
      mapType: () => "TEXT",
    };

    const diagnostics = checkCapabilities(ir, limitedDialect, spans, source, "basic.mrd");
    // basic.mrd has two columns with an ON DELETE action (users.created_by, posts.author)
    // and one index (posts_author_title_idx), so a dialect lacking both capabilities
    // reports one foreign-key-action diagnostic per such column, plus one for the index.
    expect(diagnostics.map((d) => d.code).sort()).toEqual(
      [
        EMIT_UNSUPPORTED_FOREIGN_KEY_ACTIONS,
        EMIT_UNSUPPORTED_FOREIGN_KEY_ACTIONS,
        EMIT_UNSUPPORTED_INDEXES,
      ].sort(),
    );
  });
});
