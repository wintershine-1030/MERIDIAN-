import { describe, expect, it } from "vitest";
import { all, err, isErr, isOk, map, mapErr, ok, tryCatch, unwrap, unwrapOr } from "../../../src/util/result.js";

describe("result", () => {
  it("ok() builds a successful result", () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
  });

  it("err() builds a failed result", () => {
    const result = err("bad input");
    expect(result).toEqual({ ok: false, error: "bad input" });
    expect(isOk(result)).toBe(false);
    expect(isErr(result)).toBe(true);
  });

  it("map() transforms the value of an ok result", () => {
    expect(map(ok(2), (n) => n * 10)).toEqual(ok(20));
  });

  it("map() leaves an err result untouched", () => {
    const failed = err("nope");
    expect(map(failed, (n: number) => n * 10)).toBe(failed);
  });

  it("mapErr() transforms the error of an err result", () => {
    expect(mapErr(err("nope"), (message) => message.toUpperCase())).toEqual(err("NOPE"));
  });

  it("mapErr() leaves an ok result untouched", () => {
    const succeeded = ok(1);
    expect(mapErr(succeeded, (message: string) => message.toUpperCase())).toBe(succeeded);
  });

  it("unwrap() returns the value of an ok result", () => {
    expect(unwrap(ok("value"))).toBe("value");
  });

  it("unwrap() throws for an err result", () => {
    expect(() => unwrap(err("boom"))).toThrow(/boom/);
  });

  it("unwrapOr() returns the fallback for an err result", () => {
    expect(unwrapOr(err("boom"), "fallback")).toBe("fallback");
  });

  it("tryCatch() wraps a successful call as ok", () => {
    expect(tryCatch(() => 1 + 1)).toEqual(ok(2));
  });

  it("tryCatch() wraps a thrown error as err", () => {
    const result = tryCatch(() => {
      throw new Error("thrown");
    });
    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.message).toBe("thrown");
  });

  it("all() collects every value when all results are ok", () => {
    expect(all([ok(1), ok(2), ok(3)])).toEqual(ok([1, 2, 3]));
  });

  it("all() short-circuits on the first err", () => {
    expect(all([ok(1), err("stop"), ok(3)])).toEqual(err("stop"));
  });
});
