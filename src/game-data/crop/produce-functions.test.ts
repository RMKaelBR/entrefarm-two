import { describe, expect, it, vi } from "vitest";
import { makeYield } from "../yield/calculate-yield";
import { collectCropProduce, consolidateProduce, createCropProduce, totalProduceYield } from "./produce-functions";

describe("produce tokens", () => {
  it.each(["rice", "corn"] as const)("creates unique %s whole and tenth tokens from normalized quantities", (kind) => {
    const tokens = createCropProduce(kind, { whole: 0, tenths: 23 });
    expect(tokens).toHaveLength(5);
    expect(tokens.map(t => t.denomination)).toEqual(["whole", "whole", "tenth", "tenth", "tenth"]);
    expect(tokens.every(t => t.crop === kind)).toBe(true);
    expect(new Set(tokens.map(t => t.id)).size).toBe(5);
    expect(totalProduceYield(tokens, kind)).toEqual(makeYield(2, 3));
    expect(totalProduceYield(tokens, kind === "rice" ? "corn" : "rice")).toEqual(makeYield(0));
    expect(createCropProduce(kind, makeYield(0))).toEqual([]);
  });
  it("rejects negative and invalid quantities before creating IDs", () => {
    const uuid = vi.spyOn(crypto, "randomUUID");
    try {
      expect(() => createCropProduce("rice", makeYield(0, -1))).toThrow(RangeError);
      expect(() => createCropProduce("rice", { whole: NaN, tenths: 0 })).toThrow(RangeError);
      expect(uuid).not.toHaveBeenCalled();
    } finally { uuid.mockRestore(); }
  });
  it("combines held and collected tenths without replacing whole tokens", () => {
    const held = createCropProduce("rice", makeYield(2, 3));
    const snapshot = structuredClone(held);
    const result = collectCropProduce(held, "rice", makeYield(0, 7));
    expect(totalProduceYield(result, "rice")).toEqual(makeYield(3));
    expect(result).toHaveLength(3);
    expect(result.every(t => t.denomination === "whole")).toBe(true);
    for (const token of held.slice(0, 2)) expect(result).toContain(token);
    expect(new Set(result.map(t => t.id)).size).toBe(3);
    expect(held).toEqual(snapshot);
    expect(consolidateProduce(result)).toEqual(result);
  });
  it("consolidates every crop independently, retaining earliest residual tenths", () => {
    const held = [
      ...Array.from({ length: 23 }, () => createCropProduce("rice", makeYield(0, 1))[0]),
      ...Array.from({ length: 17 }, () => createCropProduce("corn", makeYield(0, 1))[0]),
      ...createCropProduce("fruit", makeYield(2, 4)),
    ];
    const snapshot = structuredClone(held);
    const result = consolidateProduce(held);
    for (const kind of ["rice", "corn", "fruit"] as const) {
      expect(totalProduceYield(result, kind)).toEqual(totalProduceYield(held, kind));
    }
    for (const token of [...held.slice(0, 3), ...held.slice(23, 30), ...held.slice(40)]) expect(result).toContain(token);
    expect(result).toHaveLength(19);
    expect(held).toEqual(snapshot);
    const again = consolidateProduce(result);
    result.forEach((token, index) => expect(again[index]).toBe(token));
    const originalIds = new Set(held.map(t => t.id));
    expect(result.filter(t => !originalIds.has(t.id))).toHaveLength(3);
  });
  it("accumulates repeated partial collections and leaves small holdings unchanged", () => {
    let held = createCropProduce("rice", makeYield(0, 3));
    const first = held[0];
    held = collectCropProduce(held, "rice", makeYield(0, 3));
    expect(held).toHaveLength(6);
    held = collectCropProduce(held, "rice", makeYield(0, 5));
    expect(totalProduceYield(held, "rice")).toEqual(makeYield(1, 1));
    expect(held).toHaveLength(2);
    expect(held).toContain(first);
  });
});
