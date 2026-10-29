import { totalProduceYield } from "@/game-data/crop/produce-functions";
import { makeYield } from "@/game-data/yield/calculate-yield";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCrop } from "@/game-data/crop/crop-functions";
import { newFruitAdultCycle } from "@/game-data/crop/fruit-functions";
import type { FruitCrop, FruitYoung } from "@/game-data/crop/crop-types";
import { createLand } from "@/game-data/land/land-functions";
import { LAND_ORIGINS } from "@/game-data/land/land-types";
import { createLoan } from "@/game-data/loan/loan-functions";
import { useGameStore } from "./game-state";

const state = () => useGameStore.getState();
const tree = (id = state().crops[0].id) => {
  const found = state().crops.find((c) => c.id === id);
  if (!found || found.kind !== "fruit") throw new Error("Expected fruit");
  return found;
};
const rejected = (action: () => boolean) => {
  const before = state(); expect(action()).toBe(false); expect(state()).toBe(before);
};
function start(index = 0) {
  expect(state().startCropPlanting("fruit", state().lands[index].id)).toBe(true);
  return state().crops[state().crops.length - 1].id;
}
function develop(id: string) {
  for (const task of ["siteClearing", "seedlingHauling", "planting"] as const) expect(state().fundCropDevelopment(id, task)).toBe(true);
}
function inject(lifecycle: FruitCrop["lifecycle"]) {
  const current = tree();
  useGameStore.setState({ crops: [{ ...current, lifecycle }] });
}
const ready = (age: 0 | 1 = 0): FruitCrop["lifecycle"] => ({ ...newFruitAdultCycle(), stage: "ready", cycleMonth: 12, progress: 4, readyAge: age, yieldResult: "high" });
const young = (): FruitYoung => ({ phase: "young", cropMonth: 6, regularTokens: 2, bonusTokens: 0, payments: [{ month: 6, weightHundredths: 75 }] });
beforeEach(() => useGameStore.setState({ year: 1, quarter: 1, month: 1, wallet: { gold: 1000, silver: 9 },
  bank: { gold: 7, silver: 3 }, lands: LAND_ORIGINS.map(createLand), crops: [], cropPlantingHistory: [],
  produceInventory: [], children: [], loans: [], hasActiveGame: true }));
afterEach(() => vi.restoreAllMocks());

describe("fruit store lifecycle", () => {
  it("accepts all owned origins, preserves clearance, and charges exactly five gold", () => {
    rejected(() => state().startCropPlanting("fruit", "unowned"));
    const lands = state().lands;
    lands.forEach((land, i) => { const id = start(i); develop(id); rejected(() => state().startCropPlanting("fruit", land.id)); });
    expect(state().lands).toBe(lands);
    expect(state().wallet).toEqual({ gold: 1000 - 5 * lands.length, silver: 9 });
    expect(state().bank).toEqual({ gold: 7, silver: 3 });
  });
  it("funds remaining young and adult slots atomically at current values", () => {
    const id = start(); develop(id);
    inject({ ...young(), payments: [{ month: 1, weightHundredths: 100 }] });
    useGameStore.setState({ wallet: { gold: 13, silver: 99 } });
    rejected(() => state().fundAllFruitMaintenance(id));
    useGameStore.setState({ wallet: { gold: 14, silver: 9 } });
    expect(state().fundAllFruitMaintenance(id)).toBe(true);
    expect(state().wallet).toEqual({ gold: 0, silver: 9 });
    expect(tree().lifecycle).toMatchObject({ payments: [
      { month: 1, weightHundredths: 100 },
      ...Array.from({ length: 14 }, () => ({ month: 6, weightHundredths: 75 })),
    ] });
    rejected(() => state().fundAllFruitMaintenance(id));
    inject({ ...newFruitAdultCycle(), stage: "growing", cycleMonth: 7, payments: [{ month: 1, weightHundredths: 100 }] });
    useGameStore.setState({ wallet: { gold: 1, silver: 99 } });
    rejected(() => state().fundAllFruitMaintenance(id));
    useGameStore.setState({ wallet: { gold: 2, silver: 9 } });
    expect(state().fundAllFruitMaintenance(id)).toBe(true);
    expect(state().wallet).toEqual({ gold: 0, silver: 9 });
    expect(tree().lifecycle).toMatchObject({ payments: [
      { month: 1, weightHundredths: 100 }, { month: 7, weightHundredths: 50 }, { month: 7, weightHundredths: 50 },
    ] });
    rejected(() => state().fundAllFruitMaintenance(id));
    expect(state().bank).toEqual({ gold: 7, silver: 3 });
  });
  it("rejects bulk maintenance outside eligible fruit growth", () => {
    rejected(() => state().fundAllFruitMaintenance("missing"));
    const id = start();
    rejected(() => state().fundAllFruitMaintenance(id));
    for (const lifecycle of [ready(), { ...newFruitAdultCycle(), stage: "resting" as const },
      { ...newFruitAdultCycle(), stage: "growing" as const, cycleMonth: 12 }]) {
      inject(lifecycle);
      rejected(() => state().fundAllFruitMaintenance(id));
    }
    const coconut = createCrop("coconut", "other", 1, 1);
    useGameStore.setState({ crops: [coconut] });
    rejected(() => state().fundAllFruitMaintenance(coconut.id));
  });
  it("runs unmaintained growth and two collections without repurchase", () => {
    const id = start(); develop(id); const initial = tree();
    const random = vi.spyOn(Math, "random");
    for (let month = 2; month <= 60; month++) state().advanceWorldTime();
    expect(tree().lifecycle).toEqual(newFruitAdultCycle());
    for (let cycle = 0; cycle < 2; cycle++) {
      for (let month = 2; month <= 12; month++) state().advanceWorldTime();
      rejected(() => state().harvestCrop(id));
      expect(state().fundCropProduction(id, "hauling")).toBe(true);
      rejected(() => state().harvestCrop(id));
      expect(state().fundCropProduction(id, "harvesting")).toBe(true);
      expect(state().harvestCrop(id)).toBe(true);
      rejected(() => state().harvestCrop(id));
      expect(tree().lifecycle).toMatchObject({ stage: "resting", lastHarvest: { quantity: makeYield(8) } });
      state().advanceWorldTime();
      expect(tree().lifecycle).toMatchObject({ cycleMonth: 1, progress: 0, payments: [] });
    }
    expect(tree()).toMatchObject({ id, landId: initial.landId, startedYear: 1, startedMonth: 1 });
    expect(state().cropPlantingHistory).toHaveLength(1);
    expect(state().produceInventory).toHaveLength(16);
    expect(state().produceInventory.every(token => token.denomination === "whole")).toBe(true);
    expect(totalProduceYield(state().produceInventory, "fruit")).toEqual(makeYield(16));
    expect(new Set(state().produceInventory.map(p => p.id)).size).toBe(16);
    expect(state().produceInventory.every(p => p.crop === "fruit")).toBe(true);
    expect(state().wallet).toEqual({ gold: 975, silver: 9 });
    expect(state().bank).toEqual({ gold: 7, silver: 3 });
    expect(random).not.toHaveBeenCalled();
  });
  it("rejects missing IDs, invalid tasks, insufficient gold, duplicates and excess slots atomically", () => {
    rejected(() => state().fundCropDevelopment("missing", "planting"));
    rejected(() => state().fundCropMaintenance("missing"));
    rejected(() => state().fundCropProduction("missing", "hauling"));
    rejected(() => state().harvestCrop("missing"));
    useGameStore.setState({ wallet: { gold: 1, silver: 99 } });
    rejected(() => state().startCropPlanting("fruit", state().lands[0].id));
    useGameStore.setState({ wallet: { gold: 100, silver: 9 } });
    const id = start();
    // @ts-expect-error Legacy preparation key must be rejected at runtime.
    rejected(() => state().fundCropDevelopment(id, "hauling"));
    for (const task of ["toString", "__proto__", "unknown"]) {
      // @ts-expect-error Invalid runtime input.
      rejected(() => state().fundCropDevelopment(id, task));
    }
    for (const task of ["siteClearing", "seedlingHauling", "planting"] as const) {
      useGameStore.setState({ wallet: { gold: 0, silver: 99 } });
      rejected(() => state().fundCropDevelopment(id, task));
      useGameStore.setState({ wallet: { gold: 1, silver: 9 } });
      expect(state().fundCropDevelopment(id, task)).toBe(true);
      expect(state().wallet).toEqual({ gold: 0, silver: 9 });
      rejected(() => state().fundCropDevelopment(id, task));
    }
    rejected(() => state().fundCropMaintenance(id));
    useGameStore.setState({ wallet: { gold: 30, silver: 9 } });
    for (let i = 0; i < 15; i++) expect(state().fundCropMaintenance(id)).toBe(true);
    expect(state().wallet.gold).toBe(15);
    rejected(() => state().fundCropMaintenance(id));
    inject(newFruitAdultCycle());
    for (let i = 0; i < 3; i++) expect(state().fundCropMaintenance(id)).toBe(true);
    expect(state().wallet.gold).toBe(12);
    rejected(() => state().fundCropMaintenance(id));
    inject(ready(1));
    for (const task of ["toString", "__proto__", "unknown"]) {
      // @ts-expect-error Invalid runtime input.
      rejected(() => state().fundCropProduction(id, task));
    }
    for (const [task, cost] of [["harvesting", 7], ["hauling", 3]] as const) {
      useGameStore.setState({ wallet: { gold: cost - 1, silver: 99 } });
      rejected(() => state().fundCropProduction(id, task));
      useGameStore.setState({ wallet: { gold: cost, silver: 9 } });
      const inventory = state().produceInventory;
      expect(state().fundCropProduction(id, task)).toBe(true);
      expect(state().produceInventory).toBe(inventory);
      expect(state().wallet).toEqual({ gold: 0, silver: 9 });
      rejected(() => state().fundCropProduction(id, task));
    }
    expect(state().harvestCrop(id)).toBe(true);
    expect(state().produceInventory).toHaveLength(3);
    expect(state().bank).toEqual({ gold: 7, silver: 3 });
  });
  it("discards partial production payments at loss without refunds or resting", () => {
    const id = start(); inject(ready());
    expect(state().fundCropProduction(id, "harvesting")).toBe(true);
    const before = state();
    state().advanceWorldTime(); state().advanceWorldTime();
    expect(tree().lifecycle).toEqual(newFruitAdultCycle(0, { outcome: "lost", quantity: makeYield(0) }));
    expect(state().wallet).toBe(before.wallet); expect(state().bank).toBe(before.bank);
    expect(state().produceInventory).toBe(before.produceInventory);
  });
  it.each(["bonus", "readiness", "deterioration", "loss", "rest"])("freezes %s at tuition, pending loans and December decision boundaries", (boundary) => {
    start();
    const lifecycle: FruitCrop["lifecycle"] = boundary === "bonus" ? young()
      : boundary === "readiness" ? { ...newFruitAdultCycle(), stage: "growing", cycleMonth: 11, progress: 3, payments: [{ month: 2, weightHundredths: 100 }] }
      : boundary === "rest" ? { ...newFruitAdultCycle(), stage: "resting" } : ready(boundary === "loss" ? 1 : 0);
    inject(lifecycle);
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    useGameStore.setState({ children: [{ id: "student", stage: "adult_child", gender: "male", isStudying: true,
      tuitionDecision: "pending", maturity: { timeTokens: 4, timeTokensMax: 4 }, education: { progress: 0, progressMax: 4 } }] });
    const before = state(); state().advanceWorldTime(); expect(state()).toBe(before);
    useGameStore.setState({ children: [], month: 12, quarter: 4, loans: [createLoan(state().lands[0], 1)] });
    const crops = state().crops;
    state().advanceWorldTime(); expect(state().month).toBe(12); expect(state().crops).toBe(crops);
    const pending = state(); state().advanceWorldTime(); expect(state()).toBe(pending);
    expect(random).not.toHaveBeenCalled();
    useGameStore.setState({ loans: [] }); state().advanceWorldTime();
    expect(state()).toMatchObject({ year: 2, month: 1 });
    const expected = boundary === "bonus" ? { cropMonth: 7, bonusTokens: 1, payments: [] }
      : boundary === "readiness" ? { stage: "ready", readyAge: 0, yieldResult: "high" }
      : boundary === "deterioration" ? { stage: "ready", readyAge: 1 } : { stage: "growing", cycleMonth: 1 };
    expect(tree().lifecycle).toMatchObject(expected);
    expect(random).toHaveBeenCalledTimes(["bonus", "readiness"].includes(boundary) ? 1 : 0);
  });
  it("staggers development and ticks fruit, coconut, rice and corn independently across years", () => {
    const first = start(); state().fundCropDevelopment(first, "siteClearing");
    state().advanceWorldTime();
    expect(tree().lifecycle.phase).toBe("development");
    state().fundCropDevelopment(first, "seedlingHauling"); state().fundCropDevelopment(first, "planting");
    state().advanceWorldTime(); const second = start(1); develop(second);
    const coconut = createCrop("coconut", "c", 1, 1);
    const rice = createCrop("rice", "r", 1, 1); const corn = createCrop("corn", "m", 1, 1);
    useGameStore.setState({ month: 12, quarter: 4, crops: [...state().crops, coconut, { ...rice, development: { plowing: true, planting: true } }, corn] });
    state().advanceWorldTime();
    expect(state()).toMatchObject({ year: 2, month: 1 });
    expect(tree(first).lifecycle).toMatchObject({ cropMonth: 3, regularTokens: 1 });
    expect(tree(second).lifecycle).toMatchObject({ cropMonth: 2, regularTokens: 0 });
    expect(state().crops[2]).toBe(coconut); expect(state().crops[3]).toMatchObject({ maturity: { timeTokens: 1 } }); expect(state().crops[4]).toBe(corn);
  });
  it("desynchronizes collected and uncollected fruit", () => {
    const first = start(); const second = start(1);
    useGameStore.setState({ crops: state().crops.map(c => ({ ...tree(c.id), lifecycle: ready() })) });
    state().fundCropProduction(first, "harvesting"); state().fundCropProduction(first, "hauling"); state().harvestCrop(first);
    state().advanceWorldTime();
    expect(tree(first).lifecycle).toMatchObject({ cycleMonth: 1, stage: "growing" });
    expect(tree(second).lifecycle).toMatchObject({ readyAge: 1 });
    state().advanceWorldTime();
    expect(tree(first).lifecycle).toMatchObject({ cycleMonth: 2 });
    expect(tree(second).lifecycle).toMatchObject({ cycleMonth: 1, lastHarvest: { outcome: "lost" } });
  });
});
