import { createCropProduce, totalProduceYield } from "@/game-data/crop/produce-functions";
import { makeYield } from "@/game-data/yield/calculate-yield";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCrop } from "@/game-data/crop/crop-functions";
import { matureRubberIfReady, newRubberAdultCycle } from "@/game-data/crop/rubber-functions";
import { newLongTermYoung } from "@/game-data/crop/long-term-crop-functions";
import type { RubberAdult, RubberCrop } from "@/game-data/crop/crop-types";
import { createLand } from "@/game-data/land/land-functions";
import { LAND_ORIGINS } from "@/game-data/land/land-types";
import { createLoan } from "@/game-data/loan/loan-functions";
import { useGameStore } from "./game-state";

const state = () => useGameStore.getState();
function tree(id = state().crops[0].id) {
  const crop = state().crops.find(c => c.id === id);
  if (!crop || crop.kind !== "rubber") throw new Error("Expected rubber");
  return crop;
}
function rejected(action: () => boolean) {
  const before = state();
  expect(action()).toBe(false);
  expect(state()).toBe(before);
}
function start(index = 0) {
  expect(state().startCropPlanting("rubber", state().lands[index].id)).toBe(true);
  return state().crops[state().crops.length - 1].id;
}
function develop(id: string) {
  for (const task of ["siteClearing", "seedlingHauling", "planting"] as const) {
    expect(state().fundCropDevelopment(id, task)).toBe(true);
  }
}
function inject(lifecycle: RubberCrop["lifecycle"], id = tree().id) {
  useGameStore.setState({ crops: state().crops.map(c => c.id === id ? { ...tree(id), lifecycle } : c) });
}
const ready = (): Extract<RubberAdult, { stage: "ready" }> => ({ ...newRubberAdultCycle(), stage: "ready", cycleMonth: 3, progress: 1, yieldResult: "high" });
beforeEach(() => useGameStore.setState({
  year: 1, quarter: 1, month: 1, wallet: { gold: 1000, silver: 9 }, bank: { gold: 7, silver: 3 },
  lands: LAND_ORIGINS.map(createLand), crops: [], cropPlantingHistory: [], produceInventory: [],
  children: [], loans: [], hasActiveGame: true,
}));
afterEach(() => vi.restoreAllMocks());

describe("rubber store integration", () => {
  it("charges five gold for purchase/preparation on each owned terrain and retains occupancy", () => {
    rejected(() => state().startCropPlanting("rubber", "missing"));
    useGameStore.setState({ wallet: { gold: 1, silver: 99 } });
    rejected(() => state().startCropPlanting("rubber", state().lands[0].id));
    useGameStore.setState({ wallet: { gold: 1000, silver: 9 } });
    const lands = state().lands;
    lands.forEach((land, index) => {
      const id = start(index); develop(id);
      rejected(() => state().startCropPlanting("rubber", land.id));
    });
    expect(state().lands).toBe(lands);
    expect(state().wallet).toEqual({ gold: 1000 - 5 * lands.length, silver: 9 });
    expect(state().bank).toEqual({ gold: 7, silver: 3 });
  });

  it("funds remaining slots atomically and preserves historical payment weights", () => {
    const id = start();
    rejected(() => state().fundAllRubberMaintenance(id));
    develop(id);
    inject({ ...newLongTermYoung(), cropMonth: 6, payments: [{ month: 1, weightHundredths: 100 }] });
    useGameStore.setState({ wallet: { gold: 13, silver: 99 } });
    rejected(() => state().fundAllRubberMaintenance(id));
    useGameStore.setState({ wallet: { gold: 14, silver: 9 } });
    expect(state().fundAllRubberMaintenance(id)).toBe(true);
    expect(state().wallet).toEqual({ gold: 0, silver: 9 });
    expect(tree().lifecycle).toMatchObject({ payments: [
      { month: 1, weightHundredths: 100 },
      ...Array.from({ length: 14 }, () => ({ month: 6, weightHundredths: 75 })),
    ] });
    rejected(() => state().fundAllRubberMaintenance(id));
    inject(newRubberAdultCycle());
    rejected(() => state().fundAllRubberMaintenance(id));
    useGameStore.setState({ wallet: { gold: 1, silver: 9 } });
    expect(state().fundAllRubberMaintenance(id)).toBe(true);
    expect(tree().lifecycle).toMatchObject({ payments: [{ month: 1, weightHundredths: 100 }] });
    rejected(() => state().fundCropMaintenance(id));
    inject(matureRubberIfReady({ ...newLongTermYoung(), regularTokens: 16, bonusTokens: 1 }));
    rejected(() => state().fundAllRubberMaintenance(id));
    expect(state().bank).toEqual({ gold: 7, silver: 3 });
  });

  it.each([0, 1])("matures with %s surplus without refunds or identity changes", (bonusTokens) => {
    const id = start(); develop(id);
    expect(state().fundCropMaintenance(id)).toBe(true);
    inject({ ...newLongTermYoung(), cropMonth: 47, regularTokens: 15, bonusTokens });
    const before = state(); const initial = tree();
    state().advanceWorldTime();
    expect(tree()).toMatchObject({ id, landId: initial.landId, startedYear: 1, startedMonth: 1,
      lifecycle: { phase: "adult", cycleMonth: bonusTokens ? 3 : 1, progress: bonusTokens ? 1 : 0 } });
    expect(state().wallet).toBe(before.wallet);
    expect(state().bank).toBe(before.bank);
    expect(state().cropPlantingHistory).toBe(before.cropPlantingHistory);
    rejected(() => state().startCropPlanting("rubber", initial.landId));
  });

  it("runs natural unmaintained development and repeated production without repurchase", () => {
    const id = start(); develop(id);
    for (let month = 2; month <= 48; month++) state().advanceWorldTime();
    expect(tree().lifecycle).toEqual(newRubberAdultCycle());
    for (let cycle = 1; cycle <= 3; cycle++) {
      expect(state().fundCropMaintenance(id)).toBe(true);
      state().advanceWorldTime(); state().advanceWorldTime();
      expect(state().fundCropProduction(id, "tapping")).toBe(true);
      expect(state().fundCropProduction(id, "hauling")).toBe(true);
      state().advanceWorldTime();
    }
    expect(state().produceInventory).toHaveLength(9);
    expect(state().wallet).toEqual({ gold: 986, silver: 9 });
    expect(state().cropPlantingHistory).toHaveLength(1);
    expect(tree().lifecycle).toMatchObject({ cycleMonth: 1, previousCyclePenalty: false });
  });

  it.each([0, 1])("hauls after %s advances and preserves held produce thereafter", (delay) => {
    const id = start(); inject(ready());
    const before = state();
    expect(state().fundCropProduction(id, "tapping")).toBe(true);
    expect(state().produceInventory).toBe(before.produceInventory);
    expect(state().wallet.gold).toBe(before.wallet.gold - 1);
    rejected(() => state().fundCropProduction(id, "tapping"));
    if (delay) state().advanceWorldTime();
    expect(state().fundCropProduction(id, "hauling")).toBe(true);
    expect(state().wallet.gold).toBe(before.wallet.gold - 2);
    expect(state().produceInventory).toHaveLength(3 - delay);
    expect(state().produceInventory.every(token => token.denomination === "whole")).toBe(true);
    expect(totalProduceYield(state().produceInventory, "rubber")).toEqual(makeYield(3 - delay));
    expect(new Set(state().produceInventory.map(p => p.id)).size).toBe(3 - delay);
    expect(state().produceInventory.every(p => p.crop === "rubber")).toBe(true);
    rejected(() => state().fundCropProduction(id, "hauling"));
    rejected(() => state().fundCropProduction(id, "tapping"));
    const inventory = state().produceInventory;
    state().advanceWorldTime(); state().advanceWorldTime();
    expect(state().produceInventory).toBe(inventory);
    expect(tree().lifecycle).toMatchObject({ previousCyclePenalty: false, batch: null });
  });

  it("rejects unavailable and unaffordable actions and unsupported production atomically", () => {
    const id = start();
    rejected(() => state().fundCropProduction(id, "tapping"));
    rejected(() => state().fundCropProduction(id, "hauling"));
    inject(ready());
    for (const task of ["hauling", "harvesting"] as const) rejected(() => state().fundCropProduction(id, task));
    rejected(() => state().harvestCrop(id));
    useGameStore.setState({ wallet: { gold: 0, silver: 99 } });
    rejected(() => state().fundCropProduction(id, "tapping"));
    useGameStore.setState({ wallet: { gold: 1, silver: 9 } });
    expect(state().fundCropProduction(id, "tapping")).toBe(true);
    rejected(() => state().fundCropProduction(id, "hauling"));
    useGameStore.setState({ wallet: { gold: 5, silver: 9 } });
    state().advanceWorldTime(); state().advanceWorldTime();
    rejected(() => state().fundCropProduction(id, "hauling"));
    rejected(() => state().fundCropProduction(id, "tapping"));
    const other = createCrop("fruit", "other", 1, 1);
    useGameStore.setState({ crops: [...state().crops, other] });
    for (const target of ["missing", other.id]) {
      rejected(() => state().fundAllRubberMaintenance(target));
      rejected(() => state().fundCropProduction(target, "tapping"));
      rejected(() => state().fundCropProduction(target, "hauling"));
    }
  });

  it("keeps old late tapping separate from new care and refuses zero-quantity hauling", () => {
    const id = start(); inject(ready()); state().advanceWorldTime();
    expect(state().fundCropMaintenance(id)).toBe(true);
    expect(state().fundCropProduction(id, "tapping")).toBe(true);
    expect(tree().lifecycle).toMatchObject({ tappedOnTime: false, lateTappingAvailable: false, previousCyclePenalty: true,
      payments: [{ month: 1, weightHundredths: 100 }], batch: { quantity: makeYield(1), advancesSinceTapping: 0 } });
    state().advanceWorldTime();
    rejected(() => state().fundCropProduction(id, "hauling"));
    state().advanceWorldTime();
    expect(tree().lifecycle).toMatchObject({ cycleMonth: 3, batch: null });
    expect(state().fundCropProduction(id, "tapping")).toBe(true);
    expect(state().fundCropProduction(id, "hauling")).toBe(true);
    expect(state().produceInventory).toHaveLength(2);
    state().advanceWorldTime();
    expect(tree().lifecycle).toMatchObject({ previousCyclePenalty: false });
  });

  it.each(["young", "ready", "late", "batch"])("freezes %s clocks at tuition and loan boundaries", (boundary) => {
    const id = start();
    if (boundary === "young") inject({ ...newLongTermYoung(), cropMonth: 6, payments: [{ month: 1, weightHundredths: 100 }] });
    else {
      inject(ready());
      if (boundary === "batch") state().fundCropProduction(id, "tapping");
      if (boundary === "late") state().advanceWorldTime();
    }
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    useGameStore.setState({ children: [{ id: "student", stage: "adult_child", gender: "male", isStudying: true,
      tuitionDecision: "pending", maturity: { timeTokens: 4, timeTokensMax: 4 }, education: { progress: 0, progressMax: 4 } }] });
    const before = state(); state().advanceWorldTime(); expect(state()).toBe(before);
    useGameStore.setState({ children: [], month: 12, quarter: 4, loans: [createLoan(state().lands[0], 1)] });
    const crops = state().crops; const inventory = state().produceInventory;
    state().advanceWorldTime();
    expect(state().month).toBe(12); expect(state().crops).toBe(crops); expect(state().produceInventory).toBe(inventory);
    const pending = state(); state().advanceWorldTime(); expect(state()).toBe(pending);
    expect(random).not.toHaveBeenCalled();
    useGameStore.setState({ loans: [] }); state().advanceWorldTime();
    expect(state()).toMatchObject({ year: 2, month: 1 });
    expect(tree().lifecycle).not.toEqual(crops[0].kind === "rubber" ? crops[0].lifecycle : null);
  });

  it("scopes tapping and hauling to each crop and ticks all crop kinds across December", () => {
    const a = start(); const b = start(1);
    inject(ready(), a); inject(newRubberAdultCycle(), b);
    const fruit = createCrop("fruit", "f", 1, 1); const coconut = createCrop("coconut", "c", 1, 1);
    const rice = createCrop("rice", "r", 1, 1); const corn = createCrop("corn", "m", 1, 1);
    useGameStore.setState({ month: 12, quarter: 4, crops: [...state().crops, fruit, coconut,
      { ...rice, development: { plowing: true, planting: true } }, corn] });
    const second = tree(b);
    expect(state().fundCropProduction(a, "tapping")).toBe(true); expect(tree(b)).toBe(second);
    rejected(() => state().fundCropProduction(b, "hauling"));
    state().advanceWorldTime();
    expect(state()).toMatchObject({ year: 2, month: 1 });
    expect(tree(a).lifecycle).toMatchObject({ cycleMonth: 1, batch: { quantity: makeYield(2) } });
    expect(tree(b).lifecycle).toMatchObject({ cycleMonth: 2, batch: null });
    expect(state().crops[2]).toBe(fruit); expect(state().crops[3]).toBe(coconut);
    expect(state().crops[4]).toMatchObject({ maturity: { timeTokens: 1 } }); expect(state().crops[5]).toBe(corn);
  });
});

it("commits hauling payment and collection together", () => {
  const id = start();
  inject(ready());
  const inventory = state().produceInventory;
  expect(state().fundCropProduction(id, "tapping")).toBe(true);
  expect(state().produceInventory).toBe(inventory);

  useGameStore.setState({ wallet: { gold: 0, silver: 99 } });
  rejected(() => state().fundCropProduction(id, "hauling"));
  expect(tree().lifecycle).toMatchObject({ batch: { quantity: makeYield(3) } });
  expect(state().produceInventory).toBe(inventory);

  useGameStore.setState({ wallet: { gold: 1, silver: 9 } });
  expect(state().fundCropProduction(id, "hauling")).toBe(true);
  expect(state().wallet).toEqual({ gold: 0, silver: 9 });
  expect(state().produceInventory).toHaveLength(inventory.length + 3);
  expect(tree().lifecycle).toMatchObject({ batch: null });

  useGameStore.setState({ wallet: { gold: 5, silver: 9 } });
  rejected(() => state().fundCropProduction(id, "hauling"));
});

it("consolidates fractional rubber only after affordable hauling", () => {
  const id = start();
  inject({ ...ready(), tappedOnTime: true,
    batch: { quantity: makeYield(0, 7), advancesSinceTapping: 0 },
  }, id);
  const held = createCropProduce("rubber", makeYield(2, 3));
  useGameStore.setState({ produceInventory: held, wallet: { gold: 0, silver: 99 } });
  rejected(() => state().fundCropProduction(id, "hauling"));
  useGameStore.setState({ wallet: { gold: 1, silver: 0 } });
  expect(state().fundCropProduction(id, "hauling")).toBe(true);
  expect(totalProduceYield(state().produceInventory, "rubber")).toEqual(makeYield(3));
  expect(state().produceInventory).toHaveLength(3);
  expect(state().produceInventory.every(t => t.denomination === "whole")).toBe(true);
  expect(state().produceInventory).toContain(held[0]);
  expect(state().produceInventory).toContain(held[1]);
  expect(state().wallet).toEqual({ gold: 0, silver: 0 });
  expect(tree().lifecycle).toMatchObject({ batch: null });
  rejected(() => state().fundCropProduction(id, "hauling"));
});
