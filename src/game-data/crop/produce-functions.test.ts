import { describe, expect, it } from "vitest";
import { makeYield, tenthsToYield } from "../yield/calculate-yield";
import { addProduceToInventory, createProduceInventory } from "./produce-functions";

const kinds = ["rice", "corn", "coconut", "fruit", "rubber", "coffee", "cacao"] as const;

describe("produce inventory", () => {
  it("creates all seven zero quantities with isolated objects", () => {
    const first = createProduceInventory();
    const second = createProduceInventory();
    expect(first).toEqual({ rice: makeYield(0), corn: makeYield(0), coconut: makeYield(0), fruit: makeYield(0), rubber: makeYield(0), coffee: makeYield(0), cacao: makeYield(0) });
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(new Set([...Object.values(first), ...Object.values(second)]).size).toBe(14);
  });

  it.each(kinds)("adds fractions to %s without mutating holdings or incoming quantity", kind => {
    const held = { ...createProduceInventory(), rice: makeYield(1, 7), corn: makeYield(4), [kind]: makeYield(2, 3) };
    const snapshot = structuredClone(held);
    const incoming = makeYield(0, 7);
    const result = addProduceToInventory(held, kind, incoming);
    expect(result).toEqual({ ...held, [kind]: makeYield(3) });
    expect(result).not.toBe(held);
    expect(result[kind]).not.toBe(held[kind]);
    expect(held).toEqual(snapshot);
    expect(incoming).toEqual(makeYield(0, 7));
  });

  it("normalizes incoming quantities and allows zero without changing totals", () => {
    const held = addProduceToInventory(createProduceInventory(), "rice", { whole: 0, tenths: 23 });
    expect(held.rice).toEqual(makeYield(2, 3));
    expect(addProduceToInventory(held, "rice", makeYield(0))).toEqual(held);
    expect(addProduceToInventory(held, "corn", { whole: -1, tenths: 13 }).corn).toEqual(makeYield(0, 3));
  });

  it("accumulates repeated partial collections independently for every crop", () => {
    let held = createProduceInventory();
    for (const kind of kinds) {
      for (const tenths of [3, 3, 5]) held = addProduceToInventory(held, kind, makeYield(0, tenths));
    }
    for (const kind of kinds) expect(held[kind]).toEqual(makeYield(1, 1));
  });

  it.each([
    { whole: 0, tenths: -1 },
    { whole: NaN, tenths: 0 },
    { whole: 0, tenths: NaN },
    { whole: 1.5, tenths: 0 },
    { whole: 0, tenths: 0.5 },
    { whole: Number.MAX_SAFE_INTEGER, tenths: 0 },
    { whole: 0, tenths: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejects invalid quantity %j without mutating either argument", quantity => {
    const held = { ...createProduceInventory(), rice: makeYield(2, 3) };
    const snapshot = structuredClone(held);
    const incoming = structuredClone(quantity);
    expect(() => addProduceToInventory(held, "rice", quantity)).toThrow(RangeError);
    expect(held).toEqual(snapshot);
    expect(quantity).toEqual(incoming);
  });

  it("rejects an overflowing total without mutating either argument", () => {
    const held = { ...createProduceInventory(), rubber: tenthsToYield(Number.MAX_SAFE_INTEGER) };
    const snapshot = structuredClone(held);
    const incoming = makeYield(0, 1);
    expect(() => addProduceToInventory(held, "rubber", incoming)).toThrow(RangeError);
    expect(held).toEqual(snapshot);
    expect(incoming).toEqual(makeYield(0, 1));
  });
});
