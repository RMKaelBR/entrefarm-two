import { describe, expect, it } from "vitest";
import { addYield, compareYield, formatYield, makeYield, normalizeYield, subYield, tenthsToYield, yieldToTenths } from "./calculate-yield";

describe("exact yield arithmetic", () => {
  it("carries, borrows, and preserves signed intermediates", () => {
    expect(makeYield(2, 13)).toEqual({ whole: 3, tenths: 3 });
    expect(subYield(makeYield(2, 3), makeYield(0, 7))).toEqual(makeYield(1, 6));
    expect(subYield(makeYield(0), makeYield(0, 1))).toEqual({ whole: -1, tenths: 9 });
    expect(addYield(makeYield(2, 3), makeYield(0, 7))).toEqual(makeYield(3));
    expect(makeYield(2, -13)).toEqual(makeYield(0, 7));
    expect(compareYield({ whole: 0, tenths: 23 }, makeYield(2, 3))).toBe(0);
    expect(compareYield(makeYield(-1), makeYield(1))).toBe(-1);
    expect(compareYield(makeYield(1), makeYield(-1))).toBe(1);
  });
  it.each([Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, -101, -10, -1, 0, 1, 10, 101])("round trips %s exactly", total => {
    const value = tenthsToYield(total);
    expect(yieldToTenths(value)).toBe(total);
    expect(normalizeYield(value)).toEqual(value);
    expect(value.tenths).toBeGreaterThanOrEqual(0);
    expect(value.tenths).toBeLessThan(10);
  });
  it("allows exact cancellation even when the multiplication exceeds the safe range", () => {
    expect(yieldToTenths({ whole: 900719925474100, tenths: -9 })).toBe(Number.MAX_SAFE_INTEGER);
    expect(yieldToTenths({ whole: -900719925474100, tenths: 9 })).toBe(Number.MIN_SAFE_INTEGER);
    expect(makeYield(-0, -0)).toEqual({ whole: 0, tenths: 0 });
    expect(tenthsToYield(-0)).toEqual({ whole: 0, tenths: 0 });
  });
  it.each([0.1, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1])("rejects invalid value %s", invalid => {
    expect(() => makeYield(invalid)).toThrow(RangeError);
    expect(() => makeYield(0, invalid)).toThrow(RangeError);
    expect(() => tenthsToYield(invalid)).toThrow(RangeError);
  });
  it("rejects unsafe totals and arithmetic overflow", () => {
    expect(() => makeYield(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
    expect(() => makeYield(Number.MIN_SAFE_INTEGER)).toThrow(RangeError);
    const max = tenthsToYield(Number.MAX_SAFE_INTEGER);
    const min = tenthsToYield(Number.MIN_SAFE_INTEGER);
    expect(() => addYield(max, makeYield(0, 1))).toThrow(RangeError);
    expect(() => subYield(min, makeYield(0, 1))).toThrow(RangeError);
    expect(compareYield(max, min)).toBe(1);
    expect(addYield(max, min)).toEqual(makeYield(0));
  });
  it.each([[0, "0"], [20, "2"], [23, "2.3"], [7, "0.7"], [-1, "-0.1"], [-23, "-2.3"]] as const)("formats %s tenths", (total, text) => {
    expect(formatYield(tenthsToYield(total))).toBe(text);
  });
});
