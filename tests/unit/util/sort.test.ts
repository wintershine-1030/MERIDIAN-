import { describe, expect, it } from "vitest";
import { compareStrings, sortedEntries, sortedKeys, sortedValues, stableSortBy } from "../../../src/util/sort.js";

describe("compareStrings", () => {
  it("orders strings by codepoint ascending", () => {
    expect(compareStrings("a", "b")).toBeLessThan(0);
    expect(compareStrings("b", "a")).toBeGreaterThan(0);
    expect(compareStrings("a", "a")).toBe(0);
  });
});

describe("stableSortBy", () => {
  it("sorts by the derived key without mutating the input", () => {
    const input = [{ name: "beta" }, { name: "alpha" }];
    const sorted = stableSortBy(input, (item) => item.name);
    expect(sorted.map((item) => item.name)).toEqual(["alpha", "beta"]);
    expect(input.map((item) => item.name)).toEqual(["beta", "alpha"]);
  });

  it("preserves the original relative order of equal keys", () => {
    const input = [
      { name: "a", tag: "first" },
      { name: "a", tag: "second" },
      { name: "a", tag: "third" },
    ];
    const sorted = stableSortBy(input, (item) => item.name);
    expect(sorted.map((item) => item.tag)).toEqual(["first", "second", "third"]);
  });
});

describe("sortedKeys", () => {
  it("returns object keys in sorted order regardless of insertion order", () => {
    const obj = { zebra: 1, apple: 2, mango: 3 };
    expect(sortedKeys(obj)).toEqual(["apple", "mango", "zebra"]);
  });
});

describe("sortedEntries", () => {
  it("returns map entries sorted by key", () => {
    const map = new Map([
      ["zebra", 1],
      ["apple", 2],
    ]);
    expect(sortedEntries(map)).toEqual([
      ["apple", 2],
      ["zebra", 1],
    ]);
  });
});

describe("sortedValues", () => {
  it("returns set values sorted by the derived key", () => {
    const set = new Set([{ name: "zebra" }, { name: "apple" }]);
    expect(sortedValues(set, (item) => item.name)).toEqual([{ name: "apple" }, { name: "zebra" }]);
  });
});
