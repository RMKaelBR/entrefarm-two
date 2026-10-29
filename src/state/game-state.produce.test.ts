import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as cash from "@/game-data/crop/crop-functions";
import * as coconut from "@/game-data/crop/coconut-functions";
import * as fruit from "@/game-data/crop/fruit-functions";
import { createCropProduce, totalProduceYield } from "@/game-data/crop/produce-functions";
import { makeYield } from "@/game-data/yield/calculate-yield";
import type { Crop } from "@/game-data/crop/crop-types";
import { useGameStore } from "./game-state";

const state = () => useGameStore.getState();
beforeEach(() => useGameStore.setState({ crops: [], produceInventory: [], hasActiveGame: true }));
afterEach(() => vi.restoreAllMocks());
function ready(kind: "rice" | "corn" | "coconut" | "fruit"): Crop {
  if (kind === "coconut") return { ...cash.createCrop(kind, "land", 1, 1), lifecycle: {
    ...coconut.newAdultCycle(), phase: "adult", stage: "ready", cycleMonth: 3,
    readyAge: 0, yieldResult: "high", fromOverflow: false,
    production: { climbingPiling: true, husking: true, hauling: true },
  } };
  if (kind === "fruit") return { ...cash.createCrop(kind, "land", 1, 1), lifecycle: {
    ...fruit.newFruitAdultCycle(), phase: "adult", stage: "ready", cycleMonth: 12,
    readyAge: 0, yieldResult: "high", production: { harvesting: true, hauling: true },
  } };
  const crop = cash.createCrop(kind, "land", 1, 1);
  const developed = { ...crop, development: { plowing: true, planting: true },
    maturity: { timeTokens: 2, timeTokensMax: 2 },
  };
  return developed.kind === "rice"
    ? { ...developed, production: { harvesting: true, hauling: true, drying: true } }
    : { ...developed, production: { picking: true, shelling: true, hauling: true, drying: true } };
}
it("consolidates two successive rice harvests of 2.3 and 0.7", () => {
  vi.spyOn(cash, "getCropYield").mockReturnValueOnce(makeYield(2, 3)).mockReturnValueOnce(makeYield(0, 7));
  for (let i = 0; i < 2; i++) {
    const crop = ready("rice");
    useGameStore.setState({ crops: [crop] });
    expect(state().harvestCrop(crop.id)).toBe(true);
    expect(state().crops).toEqual([]);
    if (i === 0) expect(state().produceInventory).toHaveLength(5);
    const before = state();
    expect(state().harvestCrop(crop.id)).toBe(false);
    expect(state()).toBe(before);
  }
  expect(totalProduceYield(state().produceInventory, "rice")).toEqual(makeYield(3));
  expect(state().produceInventory).toHaveLength(3);
  expect(state().produceInventory.every(t => t.denomination === "whole")).toBe(true);
});
it.each(["rice", "corn", "coconut", "fruit"] as const)("consolidates mixed inventory when collecting %s and preserves lifecycle history", kind => {
  const quantity = makeYield(0, 7);
  if (kind === "coconut") vi.spyOn(coconut, "coconutYield").mockReturnValue(quantity);
  else if (kind === "fruit") vi.spyOn(fruit, "fruitYield").mockReturnValue(quantity);
  else vi.spyOn(cash, "getCropYield").mockReturnValue(quantity);
  const held = createCropProduce(kind, makeYield(2, 3));
  const other = Array.from({ length: 11 }, () => createCropProduce("rubber", makeYield(0, 1))[0]);
  const crop = ready(kind);
  useGameStore.setState({ crops: [crop], produceInventory: [...held, ...other] });
  expect(state().harvestCrop(crop.id)).toBe(true);
  const inventory = state().produceInventory;
  expect(totalProduceYield(inventory, kind)).toEqual(makeYield(3));
  expect(totalProduceYield(inventory, "rubber")).toEqual(makeYield(1, 1));
  expect(inventory).toHaveLength(5);
  for (const token of [held[0], held[1], other[0]]) expect(inventory).toContain(token);
  if (kind === "coconut" || kind === "fruit") {
    expect(state().crops[0]).toMatchObject({ id: crop.id, lifecycle: {
      stage: "resting", lastHarvest: { outcome: "collected", quantity },
    } });
  } else expect(state().crops).toEqual([]);
  const before = state();
  expect(state().harvestCrop(crop.id)).toBe(false);
  expect(state()).toBe(before);
});
