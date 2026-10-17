import { describe, expect, it, vi } from "vitest";
import { createCrop } from "./crop-functions";
import type { FruitAdult, FruitCrop, FruitYoung } from "./crop-types";
import { canCollectFruit, collectFruitCycle, fruitAdultWeight, fruitBonusChance, fruitHighChance, fruitYoungPoints, fruitYield, matureFruitIfReady, newFruitAdultCycle, prepareFruitDevelopment, prepareFruitMaintenance, prepareFruitProduction, tickFruit, tickFruitAdult, tickFruitYoung } from "./fruit-functions";
const young = (cropMonth = 1): FruitYoung => ({ phase: "young", cropMonth, regularTokens: 0, bonusTokens: 0, payments: [] });
const crop = (lifecycle: FruitCrop["lifecycle"]): FruitCrop => ({ ...createCrop("fruit", "land", 1, 1), lifecycle });
const ready = (yieldResult: "high" | "low" = "high", readyAge: 0 | 1 = 0): FruitAdult => ({ ...newFruitAdultCycle(), stage: "ready", cycleMonth: 12, progress: 4, yieldResult, readyAge });

describe("fruit rules", () => {
  it("keeps preparation frozen and starts young month one only on final payment", () => {
    let tree = createCrop("fruit", "land", 1, 1);
    const random = vi.fn();
    for (const task of ["siteClearing", "hauling", "planting"]) {
      expect(tickFruit(tree, random)).toBe(tree);
      tree = prepareFruitDevelopment(tree, task)!.crop;
      expect(prepareFruitDevelopment(tree, task)).toBeNull();
    }
    expect(tree.lifecycle).toEqual(young());
    expect(random).not.toHaveBeenCalled();
  });
  it.each([[1,100],[2,100],[3,90],[4,90],[5,75],[6,75],[7,100],[12,75],[13,100]])("weights young month %i", (month, weight) => expect(fruitYoungPoints(month)).toBe(weight));
  it("arrives at 3/6/9 and matures at 60 without care or a second tick", () => {
    let tree = crop(young()); const random = vi.fn();
    for (let month = 2; month <= 60; month++) {
      tree = tickFruit(tree, random);
      expect(tree.lifecycle).toEqual(month < 60 ? { ...young(month), regularTokens: Math.floor(month / 3) } : newFruitAdultCycle());
    }
    expect(random).not.toHaveBeenCalled();
  });
  it.each([6,12])("resolves month %i payments only when leaving and resets on either outcome", (month) => {
    let tree = crop(young(month));
    for (let i = 0; i < 15; i++) tree = prepareFruitMaintenance(tree)!.crop;
    expect(prepareFruitMaintenance(tree)).toBeNull();
    if (tree.lifecycle.phase !== "young") throw new Error("young");
    expect(fruitBonusChance(tree.lifecycle)).toBe(.75);
    for (const [roll, bonus] of [[.749999,1],[.75,0]]) {
      const random = vi.fn(() => roll);
      expect(tickFruitYoung(tree.lifecycle, random)).toEqual({ ...young(month + 1), bonusTokens: bonus });
      expect(random).toHaveBeenCalledTimes(1);
    }
  });
  it("guarantees early full care without random calls and preserves original payments", () => {
    let tree = crop(young());
    for (let i = 0; i < 15; i++) tree = prepareFruitMaintenance(tree)!.crop;
    const random = vi.fn();
    for (let i = 0; i < 6; i++) tree = tickFruit(tree, random);
    expect(tree.lifecycle).toEqual({ ...young(7), regularTokens: 2, bonusTokens: 1 });
    expect(random).not.toHaveBeenCalled();
  });
  it.each([20,21])("carries total %i and discards young care", (total) => {
    expect(matureFruitIfReady({ ...young(6), regularTokens: total, payments: [{ cropMonth: 1, pointHundredths: 100 }] })).toEqual(newFruitAdultCycle(total - 20));
  });
  it.each([[1,100],[3,100],[4,75],[6,75],[7,50],[9,50],[10,25],[11,25]])("weights adult month %i", (month, weight) => expect(fruitAdultWeight(month)).toBe(weight));
  it.each([[0,12],[1,9],[2,6],[3,3]])("readies carry %i at month %i and closes maintenance", (carry, month) => {
    let adult = newFruitAdultCycle(carry); const random = vi.fn();
    for (let next = 2; next <= month; next++) {
      adult = tickFruitAdult(adult, random);
      expect(adult.stage).toBe(next === month ? "ready" : "growing");
    }
    expect(adult).toMatchObject({ cycleMonth: month, yieldResult: "low", progress: 4 });
    expect(prepareFruitMaintenance(crop(adult))).toBeNull();
    expect(random).not.toHaveBeenCalled();
  });
  it("retains mixed adult weights and rolls only at readiness", () => {
    let tree = crop(newFruitAdultCycle()); const random = vi.fn(() => .749999);
    for (let month = 1; month < 12; month++) {
      if ([2,5,8].includes(month)) tree = prepareFruitMaintenance(tree)!.crop;
      tree = tickFruit(tree, random);
    }
    if (tree.lifecycle.phase !== "adult") throw new Error("adult");
    expect(fruitHighChance(tree.lifecycle)).toBe(.75);
    expect(tree.lifecycle.payments).toEqual([{ cycleMonth: 2, weight: 100 }, { cycleMonth: 5, weight: 75 }, { cycleMonth: 8, weight: 50 }]);
    expect(tree.lifecycle).toMatchObject({ yieldResult: "high" });
    fruitYield(tree.lifecycle); prepareFruitProduction(tree, "harvesting"); tickFruit(tree, random);
    expect(random).toHaveBeenCalledTimes(1);
    const adult: FruitAdult = { ...newFruitAdultCycle(), stage: "growing", cycleMonth: 11, progress: 3, payments: tree.lifecycle.payments };
    expect(tickFruitAdult(adult, () => .75)).toMatchObject({ yieldResult: "low" });
  });
  it.each([0,2,3])("handles %i early adult slots exactly", (count) => {
    let tree = crop(newFruitAdultCycle());
    for (let i = 0; i < count; i++) tree = prepareFruitMaintenance(tree)!.crop;
    if (tree.lifecycle.phase !== "adult") throw new Error("adult");
    expect(fruitHighChance(tree.lifecycle)).toBe(count / 3);
    const random = vi.fn(() => 2 / 3);
    const adult: FruitAdult = { ...tree.lifecycle, stage: "growing", cycleMonth: 11, progress: 3 };
    expect(tickFruitAdult(adult, random)).toMatchObject({ yieldResult: count === 3 ? "high" : "low" });
    expect(random).toHaveBeenCalledTimes(count === 2 ? 1 : 0);
    if (count === 3) expect(prepareFruitMaintenance(tree)).toBeNull();
  });
  it.each(["high", "low"] as const)("deteriorates %s once then immediately restarts without rolls", (result) => {
    const random = vi.fn(); const adult = ready(result);
    expect(fruitYield(adult)).toBe(result === "high" ? 12 : 8);
    const overripe = tickFruitAdult(adult, random);
    expect(fruitYield(overripe)).toBe(result === "high" ? 3 : 2);
    const next = tickFruitAdult(overripe, random);
    expect(next).toEqual(newFruitAdultCycle(0, { outcome: "lost", quantity: 0 }));
    expect(fruitYield(next)).toBe(0); expect(random).not.toHaveBeenCalled();
  });
  it.each([0,1] as const)("requires both fees in either order at age %i and rests on collection", (age) => {
    for (const tasks of [["hauling", "harvesting"], ["harvesting", "hauling"]]) {
      let tree = crop(ready("high", age));
      for (const task of tasks) {
        if (tree.lifecycle.phase !== "adult") throw new Error("adult");
        expect(canCollectFruit(tree.lifecycle)).toBe(false);
        tree = prepareFruitProduction(tree, task)!.crop;
        expect(prepareFruitProduction(tree, task)).toBeNull();
      }
      if (tree.lifecycle.phase !== "adult") throw new Error("adult");
      expect(canCollectFruit(tree.lifecycle)).toBe(true);
      const rest = collectFruitCycle(fruitYield(tree.lifecycle));
      expect(prepareFruitMaintenance(crop(rest))).toBeNull();
      expect(tickFruitAdult(rest, vi.fn())).toEqual(newFruitAdultCycle(0, rest.lastHarvest));
    }
  });
  it("rejects invalid keys and ineligible payments", () => {
    for (const task of ["toString", "__proto__", "unknown"]) {
      expect(prepareFruitDevelopment(createCrop("fruit", "p", 1, 1), task)).toBeNull();
      expect(prepareFruitProduction(crop(ready()), task)).toBeNull();
    }
    expect(prepareFruitMaintenance(createCrop("fruit", "p", 1, 1))).toBeNull();
    expect(prepareFruitProduction(crop(newFruitAdultCycle()), "hauling")).toBeNull();
  });
});
