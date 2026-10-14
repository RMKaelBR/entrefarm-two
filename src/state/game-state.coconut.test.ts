import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCrop } from "@/game-data/crop/crop-functions";
import { newAdultCycle } from "@/game-data/crop/coconut-functions";
import type { CoconutCrop, CoconutYoung } from "@/game-data/crop/crop-types";
import { createLand } from "@/game-data/land/land-functions";
import { LAND_ORIGINS } from "@/game-data/land/land-types";
import { createLoan } from "@/game-data/loan/loan-functions";
import { useGameStore } from "./game-state";

const state = () => useGameStore.getState();
const tree = (id = state().crops[0].id) => {
  const found = state().crops.find((c) => c.id === id);
  if (!found || found.kind !== "coconut") throw new Error("Expected coconut");
  return found;
};
const rejected = (action: () => boolean) => {
  const before = state(); expect(action()).toBe(false); expect(state()).toBe(before);
};
function start(index = 0) {
  expect(state().startCropPlanting("coconut", state().lands[index].id)).toBe(true);
  return state().crops[state().crops.length - 1].id;
}
function develop(id: string) {
  for (const task of ["clearing", "hauling", "planting"] as const) expect(state().fundCropDevelopment(id, task)).toBe(true);
}
function inject(lifecycle: CoconutCrop["lifecycle"]) {
  const current = tree();
  useGameStore.setState({ crops: [{ ...current, lifecycle }] });
}
const ready = (age: 0 | 1 | 2 = 0): CoconutCrop["lifecycle"] => ({ ...newAdultCycle(), stage: "ready", cycleMonth: 3, readyAge: age, yieldResult: "high", fromOverflow: false });
const young = (): CoconutYoung => ({ phase: "young", cropMonth: 6, regularTokens: 2, bonusTokens: 0, payments: [{ cropMonth: 6, pointHundredths: 75 }] });
beforeEach(() => useGameStore.setState({ year: 1, quarter: 1, month: 1, wallet: { gold: 1000, silver: 9 },
  bank: { gold: 7, silver: 3 }, lands: LAND_ORIGINS.map(createLand), crops: [], cropPlantingHistory: [],
  produceInventory: [], children: [], loans: [], hasActiveGame: true }));
afterEach(() => vi.restoreAllMocks());

describe("coconut store lifecycle", () => {
  it("funds all eight young maintenance slots atomically with exactly eight gold", () => {
    const id = start(); develop(id);
    useGameStore.setState({ wallet: { gold: 7, silver: 99 } });
    rejected(() => state().fundAllCoconutMaintenance(id));
    useGameStore.setState({ wallet: { gold: 8, silver: 9 } });
    expect(state().fundAllCoconutMaintenance(id)).toBe(true);
    expect(state().wallet).toEqual({ gold: 0, silver: 9 });
    expect(tree().lifecycle).toMatchObject({ payments: Array.from({ length: 8 }, () => ({ cropMonth: 1, pointHundredths: 100 })) });
    rejected(() => state().fundAllCoconutMaintenance(id));
  });
  it("fills only remaining slots using current-month points and preserves earlier payments", () => {
    const id = start(); inject({ ...young(), cropMonth: 3, payments: [{ cropMonth: 1, pointHundredths: 100 }] });
    useGameStore.setState({ wallet: { gold: 7, silver: 9 } });
    expect(state().fundAllCoconutMaintenance(id)).toBe(true);
    expect(state().wallet).toEqual({ gold: 0, silver: 9 });
    expect(tree().lifecycle).toMatchObject({ payments: [{ cropMonth: 1, pointHundredths: 100 },
      ...Array.from({ length: 7 }, () => ({ cropMonth: 3, pointHundredths: 90 }))] });
  });
  it("rejects bulk maintenance for missing crops, preparation, adult trees, and cash crops", () => {
    rejected(() => state().fundAllCoconutMaintenance("missing"));
    const id = start();
    rejected(() => state().fundAllCoconutMaintenance(id));
    inject(newAdultCycle());
    rejected(() => state().fundAllCoconutMaintenance(id));
    const rice = createCrop("rice", "p", 1, 1);
    useGameStore.setState({ crops: [rice] });
    rejected(() => state().fundAllCoconutMaintenance(rice.id));
  });
  it.each([0, 1, 2] as const)("requires husking before production hauling at fruit age %i", (age) => {
    const id = start(); inject(ready(age));
    const walletBefore = { ...state().wallet };
    rejected(() => state().fundCropProduction(id, "hauling"));
    expect(state().wallet).toEqual(walletBefore);
    expect(tree().lifecycle).toMatchObject({ production: { husking: false, hauling: false } });
    expect(state().fundCropProduction(id, "husking")).toBe(true);
    expect(state().fundCropProduction(id, "hauling")).toBe(true);
    expect(state().wallet).toEqual({ ...walletBefore, gold: walletBefore.gold - 3 });
    expect(tree().lifecycle).toMatchObject({ production: { husking: true, hauling: true } });
    rejected(() => state().fundCropProduction(id, "hauling"));
  });
  it("accepts every owned land origin and rejects missing or occupied parcels", () => {
    rejected(() => state().startCropPlanting("coconut", "missing"));
    const lands = state().lands;
    for (let index = 0; index < lands.length; index++) {
      const id = start(index);
      rejected(() => state().startCropPlanting("coconut", lands[index].id));
      rejected(() => state().startCropPlanting("corn", lands[index].id));
      develop(id);
    }
    expect(state().lands).toBe(lands);
    expect(state().lands.find((land) => land.origin === "forestedPlains")?.isCleared).toBe(false);
    expect(state().wallet.gold).toBe(984);
    expect(state().bank).toEqual({ gold: 7, silver: 3 });
  });
  it("runs ordinary young growth and two recurring collections without repurchase", () => {
    const random = vi.spyOn(Math, "random");
    const id = start(); develop(id);
    const identity = tree();
    for (let month = 2; month <= 96; month++) state().advanceWorldTime();
    expect(tree().lifecycle).toEqual(newAdultCycle());
    for (let cycle = 0; cycle < 2; cycle++) {
      expect(state().fundCropMaintenance(id)).toBe(true);
      state().advanceWorldTime(); state().advanceWorldTime();
      rejected(() => state().harvestCrop(id));
      for (const task of ["climbingPiling", "husking", "hauling"] as const) expect(state().fundCropProduction(id, task)).toBe(true);
      expect(state().harvestCrop(id)).toBe(true);
      rejected(() => state().harvestCrop(id));
      expect(tree().lifecycle).toMatchObject({ stage: "resting", lastHarvest: { outcome: "collected", quantity: 3 } });
      rejected(() => state().fundCropMaintenance(id));
      state().advanceWorldTime();
      expect(tree().lifecycle).toMatchObject({ stage: "growing", cycleMonth: 1 });
    }
    expect(tree()).toMatchObject({ id: identity.id, landId: identity.landId, startedYear: 1, startedMonth: 1 });
    expect(state().produceInventory).toHaveLength(6);
    expect(new Set(state().produceInventory.map((p) => p.id)).size).toBe(6);
    expect(state().produceInventory.every((p) => p.crop === "coconut")).toBe(true);
    expect(state().cropPlantingHistory).toHaveLength(1);
    expect(state().wallet.gold).toBe(986);
    expect(state().bank).toEqual({ gold: 7, silver: 3 });
    expect(random).not.toHaveBeenCalled();
  });
  it.each([3, 12])("separates harvest month %i from the next cycle and respects blocked advances", (month) => {
    const id = start(); inject(ready());
    useGameStore.setState({ month, quarter: month / 3 });
    for (const task of ["climbingPiling", "husking", "hauling"] as const) state().fundCropProduction(id, task);
    expect(state().harvestCrop(id)).toBe(true);
    expect(state().month).toBe(month);
    expect(tree().lifecycle).toMatchObject({ stage: "resting" });
    expect(tree().lifecycle).not.toHaveProperty("cycleMonth");
    const random = vi.spyOn(Math, "random");
    useGameStore.setState({ children: [{ id: "student", stage: "adult_child", gender: "male", isStudying: true,
      tuitionDecision: "pending", maturity: { timeTokens: 4, timeTokensMax: 4 }, education: { progress: 0, progressMax: 4 } }] });
    const blocked = state(); state().advanceWorldTime(); expect(state()).toBe(blocked);
    rejected(() => state().harvestCrop(id));
    rejected(() => state().fundCropMaintenance(id));
    rejected(() => state().fundCropProduction(id, "husking"));
    useGameStore.setState({ children: [] });
    for (const cycleMonth of [1, 2, 3]) {
      state().advanceWorldTime();
      expect(state().month).toBe(((month + cycleMonth - 1) % 12) + 1);
      expect(tree().lifecycle).toMatchObject({ cycleMonth, stage: cycleMonth === 3 ? "ready" : "growing" });
      if (cycleMonth < 3) rejected(() => state().harvestCrop(id));
    }
    expect(state().year).toBe(month === 12 ? 2 : 1);
    expect(random).not.toHaveBeenCalled();
  });
  it.each([1, 2] as const)("accepts adult F&M once in month %i and rejects it through readiness and rest", (month) => {
    const id = start(); inject(newAdultCycle());
    if (month === 2) state().advanceWorldTime();
    const random = vi.spyOn(Math, "random").mockReturnValue(0.749999);
    const before = state();
    expect(state().fundCropMaintenance(id)).toBe(true);
    expect(state().wallet.gold).toBe(before.wallet.gold - 1);
    expect(state().bank).toBe(before.bank);
    expect(tree().lifecycle).toMatchObject({ fmPaidMonth: month });
    rejected(() => state().fundCropMaintenance(id));
    for (let next = month + 1; next <= 3; next++) state().advanceWorldTime();
    expect(tree().lifecycle).toMatchObject({ stage: "ready", yieldResult: "high" });
    for (const age of [0, 1, 2]) {
      expect(tree().lifecycle).toMatchObject({ readyAge: age });
      rejected(() => state().fundCropMaintenance(id));
      state().advanceWorldTime();
    }
    expect(tree().lifecycle).toMatchObject({ stage: "resting", fmPaidMonth: null });
    rejected(() => state().fundCropMaintenance(id));
    state().advanceWorldTime();
    expect(tree().lifecycle).toMatchObject({ cycleMonth: 1, fmPaidMonth: null });
    expect(state().fundCropMaintenance(id)).toBe(true);
    expect(random).toHaveBeenCalledTimes(month === 2 ? 1 : 0);
  });
  it("keeps January timing, staggered trees, and year rollover independent", () => {
    const first = start(); develop(first);
    state().advanceWorldTime();
    const second = start(1); develop(second);
    state().advanceWorldTime();
    expect(state().month).toBe(3);
    expect(tree(first).lifecycle).toMatchObject({ cropMonth: 3, regularTokens: 1 });
    expect(tree(second).lifecycle).toMatchObject({ cropMonth: 2, regularTokens: 0 });
    useGameStore.setState({ month: 12, quarter: 4 });
    state().advanceWorldTime();
    expect(state()).toMatchObject({ year: 2, month: 1 });
    expect(tree(first).lifecycle).toMatchObject({ cropMonth: 4, regularTokens: 1 });
    expect(tree(second).lifecycle).toMatchObject({ cropMonth: 3, regularTokens: 1 });
  });
  it("freezes unpaid preparation across advances", () => {
    const id = start(); const before = tree();
    state().advanceWorldTime(); state().advanceWorldTime();
    expect(tree()).toBe(before);
    rejected(() => state().fundCropMaintenance(id));
    rejected(() => state().fundCropProduction(id, "husking"));
  });
  it("rejects unaffordable, invalid and duplicate payments atomically", () => {
    useGameStore.setState({ wallet: { gold: 0, silver: 9 } });
    rejected(() => state().startCropPlanting("coconut", state().lands[0].id));
    useGameStore.setState({ wallet: { gold: 100, silver: 9 } });
    const id = start();
    for (const task of ["toString", "__proto__", "unknown"]) {
      // @ts-expect-error Invalid runtime input.
      rejected(() => state().fundCropDevelopment(id, task));
    }
    for (const task of ["clearing", "hauling", "planting"] as const) {
      useGameStore.setState({ wallet: { gold: 0, silver: 9 } });
      rejected(() => state().fundCropDevelopment(id, task));
      useGameStore.setState({ wallet: { gold: 1, silver: 9 } });
      expect(state().fundCropDevelopment(id, task)).toBe(true);
      expect(state().wallet).toEqual({ gold: 0, silver: 9 });
      rejected(() => state().fundCropDevelopment(id, task));
    }
    rejected(() => state().fundCropMaintenance(id));
    useGameStore.setState({ wallet: { gold: 20, silver: 9 } });
    for (let i = 0; i < 8; i++) expect(state().fundCropMaintenance(id)).toBe(true);
    rejected(() => state().fundCropMaintenance(id));
    inject(newAdultCycle());
    expect(state().fundCropMaintenance(id)).toBe(true);
    rejected(() => state().fundCropMaintenance(id));
    inject(ready());
    rejected(() => state().fundCropMaintenance(id));
    for (const task of ["toString", "__proto__", "unknown"]) {
      // @ts-expect-error Invalid runtime input.
      rejected(() => state().fundCropProduction(id, task));
    }
    for (const [task, cost] of [["climbingPiling", 1], ["husking", 1], ["hauling", 2]] as const) {
      useGameStore.setState({ wallet: { gold: cost - 1, silver: 9 } });
      rejected(() => state().fundCropProduction(id, task));
      useGameStore.setState({ wallet: { gold: cost, silver: 9 } });
      expect(state().fundCropProduction(id, task)).toBe(true);
      expect(state().wallet).toEqual({ gold: 0, silver: 9 });
      rejected(() => state().fundCropProduction(id, task));
    }
    expect(state().bank).toEqual({ gold: 7, silver: 3 });
  });
  it.each([1, 2] as const)("collects fallen fruit at age %i with climbing waived", (age) => {
    const id = start(); inject(ready(age));
    rejected(() => state().fundCropProduction(id, "climbingPiling"));
    rejected(() => state().harvestCrop(id));
    rejected(() => state().fundCropMaintenance(id));
    expect(state().fundCropProduction(id, "husking")).toBe(true);
    rejected(() => state().harvestCrop(id));
    expect(state().fundCropProduction(id, "hauling")).toBe(true);
    expect(state().harvestCrop(id)).toBe(true);
    expect(state().produceInventory).toHaveLength(2);
    expect(tree().lifecycle).toMatchObject({ stage: "resting", fmPaidMonth: null });
    state().advanceWorldTime();
    expect(tree().lifecycle).toMatchObject({ cycleMonth: 1, fmPaidMonth: null });
  });
  it("loses on the third advance without refunds or produce and restarts unfunded", () => {
    const id = start(); inject(ready());
    expect(state().fundCropProduction(id, "climbingPiling")).toBe(true);
    expect(state().fundCropProduction(id, "husking")).toBe(true);
    rejected(() => state().fundCropMaintenance(id));
    const before = state();
    state().advanceWorldTime();
    expect(tree().lifecycle).toMatchObject({ readyAge: 1, production: { climbingPiling: true } });
    state().advanceWorldTime();
    expect(tree().lifecycle).toMatchObject({ readyAge: 2 });
    state().advanceWorldTime();
    expect(tree().lifecycle).toMatchObject({ stage: "resting", fmPaidMonth: null, lastHarvest: { outcome: "lost", quantity: 0 } });
    state().advanceWorldTime();
    expect(tree().lifecycle).toEqual({ ...newAdultCycle(), lastHarvest: { outcome: "lost", quantity: 0 } });
    expect(tree().id).toBe(id);
    expect(state().wallet).toBe(before.wallet);
    expect(state().bank).toBe(before.bank);
    expect(state().produceInventory).toBe(before.produceInventory);
    expect(state().cropPlantingHistory).toBe(before.cropPlantingHistory);
  });
  it("blocks tuition, December decisions, and pending loans without settlement or rolls", () => {
    start(); inject(young());
    const random = vi.spyOn(Math, "random");
    useGameStore.setState({ children: [{ id: "student", stage: "adult_child", gender: "male", isStudying: true,
      tuitionDecision: "pending", maturity: { timeTokens: 4, timeTokensMax: 4 }, education: { progress: 0, progressMax: 4 } }] });
    const before = state(); state().advanceWorldTime(); expect(state()).toBe(before);
    useGameStore.setState({ children: [], month: 12, quarter: 4, loans: [createLoan(state().lands[0], 1)] });
    const crops = state().crops;
    state().advanceWorldTime(); expect(state().month).toBe(12); expect(state().crops).toBe(crops);
    const pending = state(); state().advanceWorldTime(); expect(state()).toBe(pending);
    expect(random).not.toHaveBeenCalled();
    useGameStore.setState({ loans: [] }); random.mockReturnValue(0);
    state().advanceWorldTime();
    expect(tree().lifecycle).toMatchObject({ cropMonth: 7, bonusTokens: 1, payments: [] });
    expect(random).toHaveBeenCalledTimes(1);
  });
  it("ticks mixed crops independently and retains cash harvest behavior", () => {
    const id = start(); inject(ready(2));
    const rice = createCrop("rice", state().lands[2].id, 1, 1);
    const corn = createCrop("corn", state().lands[3].id, 1, 1);
    useGameStore.setState({ crops: [tree(), { ...rice, development: { plowing: true, planting: true } }, corn] });
    state().advanceWorldTime(); state().advanceWorldTime(); state().advanceWorldTime();
    expect(tree(id).lifecycle).toMatchObject({ stage: "growing", cycleMonth: 2 });
    expect(state().crops[1]).toMatchObject({ maturity: { timeTokens: 2 } });
    expect(state().crops[2]).toBe(corn);
    for (const task of ["harvesting", "hauling", "drying"] as const) expect(state().fundCropProduction(rice.id, task)).toBe(true);
    expect(state().harvestCrop(rice.id)).toBe(true);
    expect(state().crops.map((c) => c.id)).toEqual([id, corn.id]);
    expect(state().produceInventory).toHaveLength(2);
  });
});
