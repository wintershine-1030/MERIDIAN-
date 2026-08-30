import { describe, expect, it } from "vitest";
import { LineIndex, makeSpan, spanLength, spansOverlap } from "../../../src/util/span.js";

describe("makeSpan", () => {
  it("builds a span from start and end offsets", () => {
    expect(makeSpan(3, 7)).toEqual({ start: 3, end: 7 });
  });

  it("throws when end is before start", () => {
    expect(() => makeSpan(7, 3)).toThrow(/invalid span/);
  });
});

describe("spanLength", () => {
  it("computes the offset distance", () => {
    expect(spanLength(makeSpan(3, 7))).toBe(4);
  });
});

describe("spansOverlap", () => {
  it("is true for spans that share offsets", () => {
    expect(spansOverlap(makeSpan(0, 5), makeSpan(3, 8))).toBe(true);
  });

  it("is false for adjacent spans that only touch at a boundary", () => {
    expect(spansOverlap(makeSpan(0, 5), makeSpan(5, 10))).toBe(false);
  });

  it("is false for disjoint spans", () => {
    expect(spansOverlap(makeSpan(0, 5), makeSpan(10, 15))).toBe(false);
  });
});

describe("LineIndex", () => {
  it("maps offset 0 to line 1, column 1", () => {
    const index = new LineIndex("abc");
    expect(index.positionAt(0)).toEqual({ line: 1, column: 1 });
  });

  it("maps an offset partway through the first line to the right column", () => {
    const index = new LineIndex("abc");
    expect(index.positionAt(2)).toEqual({ line: 1, column: 3 });
  });

  it("maps the offset right after a newline to the next line, column 1", () => {
    const index = new LineIndex("ab\ncd");
    expect(index.positionAt(3)).toEqual({ line: 2, column: 1 });
  });

  it("maps an offset on a later line to the correct line and column", () => {
    const index = new LineIndex("ab\ncd\nef");
    expect(index.positionAt(7)).toEqual({ line: 3, column: 2 });
  });

  it("throws for an offset beyond the source length", () => {
    const index = new LineIndex("abc");
    expect(() => index.positionAt(4)).toThrow(/out of range/);
  });

  it("throws for a negative offset", () => {
    const index = new LineIndex("abc");
    expect(() => index.positionAt(-1)).toThrow(/out of range/);
  });

  it("resolves every offset correctly across many lines", () => {
    const lineCount = 500;
    const source = Array.from({ length: lineCount }, (_, i) => `line${i}`).join("\n");
    const index = new LineIndex(source);
    const lines = source.split("\n");

    let offset = 0;
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const line = lines[lineNumber]!;
      expect(index.positionAt(offset)).toEqual({ line: lineNumber + 1, column: 1 });
      expect(index.positionAt(offset + line.length)).toEqual({ line: lineNumber + 1, column: line.length + 1 });
      offset += line.length + 1;
    }
  });
});
