import { describe, expect, it } from "vitest";
import { CONFIG_INVALID_FIELD, CONFIG_INVALID_JSON } from "../../../src/config/codes.js";
import { loadConfig, mergeConfig } from "../../../src/config/load.js";
import { DEFAULT_CONFIG } from "../../../src/config/types.js";

describe("loadConfig", () => {
  it("returns the default config when no file is present", () => {
    const { config, diagnostics } = loadConfig(null, "meridian.config.json");
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(diagnostics).toEqual([]);
  });

  it("merges valid file overrides on top of defaults", () => {
    const { config, diagnostics } = loadConfig(
      JSON.stringify({ dialect: "sqlite", strict: true }),
      "meridian.config.json",
    );
    expect(diagnostics).toEqual([]);
    expect(config).toEqual({ ...DEFAULT_CONFIG, dialect: "sqlite", strict: true });
  });

  it("reports invalid JSON and falls back to defaults", () => {
    const { config, diagnostics } = loadConfig("{ not valid json", "meridian.config.json");
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe(CONFIG_INVALID_JSON);
  });

  it("reports an invalid field but keeps valid fields from the same file", () => {
    const { config, diagnostics } = loadConfig(
      JSON.stringify({ dialect: "mysql", strict: true }),
      "meridian.config.json",
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe(CONFIG_INVALID_FIELD);
    expect(config).toEqual({ ...DEFAULT_CONFIG, strict: true });
  });
});

describe("configuration precedence: flag > file > default", () => {
  it("layers file overrides onto defaults, then flag overrides onto the result", () => {
    const fileLayer = { dialect: "sqlite" as const, strict: true };
    const flagLayer = { dialect: "postgres" as const };

    const afterFile = mergeConfig(DEFAULT_CONFIG, fileLayer);
    expect(afterFile.dialect).toBe("sqlite");
    expect(afterFile.strict).toBe(true);

    const afterFlag = mergeConfig(afterFile, flagLayer);
    expect(afterFlag.dialect).toBe("postgres");
    expect(afterFlag.strict).toBe(true);
  });
});
