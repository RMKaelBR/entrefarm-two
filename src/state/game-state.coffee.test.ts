import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCrop, getCropPlacementBlockReason } from "@/game-data/crop/crop-functions";
import { newCoffeeAdult, tickCoffeeAdult } from "@/game-data/crop/coffee-functions";
import { newLongTermYoung } from "@/game-data/crop/long-term-crop-functions";
import { createProduceInventory } from "@/game-data/crop/produce-functions";
import { makeYield } from "@/game-data/yield/calculate-yield";
import { clearLand, createLand, irrigateLand } from "@/game-data/land/land-functions";
import { LAND_ORIGINS } from "@/game-data/land/land-types";
import { createLoan } from "@/game-data/loan/loan-functions";
import type { CoffeeCrop } from "@/game-data/crop/crop-types";
import { useGameStore } from "./game-state";

const state = () => useGameStore.getState();
function tree(id = state().crops[0].id) {
  const crop = state().crops.find(c => c.id === id);
  if (!crop || crop.kind !== "coffee") throw Error("Expected coffee");
  return crop;
}
function rejected(action: () => boolean) {
  const before = state(); expect(action()).toBe(false); expect(state()).toBe(before);
}
function start(index = 0) {
  expect(state().startCropPlanting("coffee", state().lands[index].id)).toBe(true);
  return state().crops.at(-1)!.id;
}
function inject(lifecycle: CoffeeCrop["lifecycle"], id = tree().id) {
  useGameStore.setState({ crops: state().crops.map(c => c.id === id ? { ...tree(id), lifecycle } : c) });
}
function ready() {
  const adult = newCoffeeAdult({ year: 1, month: 1 });
  adult.payments = Array.from({ length: 8 }, () => ({ month: 2, weightHundredths: 100 }));
  return tickCoffeeAdult(adult, { year: 1, month: 11 }, () => 0);
}
beforeEach(() => useGameStore.setState({
  year: 1, month: 1, quarter: 1, wallet: { gold: 1000, silver: 9 }, bank: { gold: 7, silver: 3 },
  lands: LAND_ORIGINS.map(createLand), crops: [], cropPlantingHistory: [], produceInventory: createProduceInventory(),
  children: [], loans: [], hasActiveGame: true,
}));
afterEach(() => vi.restoreAllMocks());

it("plants on every owned origin, clearance, and irrigation state for nine gold including preparation", () => {
  for (const origin of LAND_ORIGINS) {
    const base = createLand(origin);
    for (const land of [base, clearLand(base), irrigateLand(clearLand(base))]) {
      useGameStore.setState({ lands: [land], crops: [] });
      expect(getCropPlacementBlockReason("coffee", land)).toBeNull();
      rejected(() => state().startCropPlanting("coffee", "unowned"));
      const wallet = state().wallet.gold; const id = start();
      for (const task of ["siteClearing", "seedlingHauling", "planting"] as const) expect(state().fundCropDevelopment(id, task)).toBe(true);
      expect(tree().lifecycle).toEqual(newLongTermYoung());
      expect(state().wallet).toEqual({ gold: wallet - 9, silver: 9 });
      expect(state().lands[0]).toBe(land);
      rejected(() => state().startCropPlanting("coffee", land.id));
    }
  }
  expect(state().bank).toEqual({ gold: 7, silver: 3 });
});

it("rejects unaffordable and invalid actions and funds all remaining young/adult care atomically", () => {
  useGameStore.setState({ wallet: { gold: 4, silver: 99 } });
  rejected(() => state().startCropPlanting("coffee", state().lands[0].id));
  useGameStore.setState({ wallet: { gold: 100, silver: 9 } });
  const id = start();
  rejected(() => state().fundAllCoffeeMaintenance(id));
  rejected(() => state().fundAllCoffeeMaintenance("missing"));
  rejected(() => state().fundCropProduction(id, "harvesting"));
  inject({ ...newLongTermYoung(), cropMonth: 6, payments: [{ month: 1, weightHundredths: 100 }] });
  useGameStore.setState({ wallet: { gold: 12, silver: 99 } });
  rejected(() => state().fundAllCoffeeMaintenance(id));
  useGameStore.setState({ wallet: { gold: 13, silver: 9 } });
  expect(state().fundAllCoffeeMaintenance(id)).toBe(true);
  expect(state().wallet).toEqual({ gold: 0, silver: 9 });
  expect(tree().lifecycle).toMatchObject({ payments: [{ month: 1, weightHundredths: 100 }, ...Array.from({ length: 13 }, () => ({ month: 6, weightHundredths: 75 }))] });
  rejected(() => state().fundAllCoffeeMaintenance(id));
  inject(newCoffeeAdult({ year: 1, month: 5 }));
  rejected(() => state().fundCropMaintenance(id));
  inject(newCoffeeAdult({ year: 1, month: 12 }));
  useGameStore.setState({ wallet: { gold: 7, silver: 99 } });
  rejected(() => state().fundAllCoffeeMaintenance(id));
  expect(state().fundCropMaintenance(id)).toBe(true);
  useGameStore.setState({ wallet: { gold: 7, silver: 9 } });
  expect(state().fundAllCoffeeMaintenance(id)).toBe(true);
  expect(tree().lifecycle).toMatchObject({ payments: Array.from({ length: 8 }, () => ({ month: 1, weightHundredths: 100 })) });
  const other = createCrop("fruit", "other", 1, 1);
  useGameStore.setState({ crops: [...state().crops, other] });
  rejected(() => state().fundAllCoffeeMaintenance(other.id));
});

it.each([0, 1])("collects only on hauling after %s months, preserves fractions and keeps held coffee", delay => {
  const id = start(); inject(ready());
  useGameStore.setState({ month: 11, quarter: 4, produceInventory: { ...createProduceInventory(), coffee: makeYield(0, 7) } });
  const before = state();
  rejected(() => state().collectCropProduce(id));
  rejected(() => state().fundCropProduction(id, "hauling"));
  rejected(() => state().fundCropProduction(id, "tapping"));
  expect(state().fundCropProduction(id, "harvesting")).toBe(true);
  expect(state().produceInventory).toBe(before.produceInventory);
  rejected(() => state().fundCropProduction(id, "harvesting"));
  useGameStore.setState({ wallet: { gold: 3, silver: 99 } });
  rejected(() => state().fundCropProduction(id, "dryingMilling"));
  useGameStore.setState({ wallet: { gold: before.wallet.gold - 4, silver: 9 } });
  expect(state().fundCropProduction(id, "dryingMilling")).toBe(true);
  if (delay) state().advanceWorldTime();
  const batch = tree().lifecycle;
  useGameStore.setState({ wallet: { gold: 1, silver: 99 } });
  rejected(() => state().fundCropProduction(id, "hauling"));
  expect(tree().lifecycle).toBe(batch);
  useGameStore.setState({ wallet: { gold: before.wallet.gold - 8, silver: 9 } });
  expect(state().fundCropProduction(id, "hauling")).toBe(true);
  expect(state().wallet).toEqual({ gold: before.wallet.gold - 10, silver: 9 });
  expect(state().produceInventory.coffee).toEqual(makeYield(1, 2));
  expect(state().bank).toBe(before.bank);
  expect(state().cropPlantingHistory).toBe(before.cropPlantingHistory);
  rejected(() => state().fundCropProduction(id, "hauling"));
  rejected(() => state().collectCropProduce(id));
  const inventory = state().produceInventory;
  for (let i = 0; i < 5; i++) state().advanceWorldTime();
  expect(state().produceInventory).toBe(inventory);
  rejected(() => state().startCropPlanting("coffee", tree().landId));
});

it.each(["young", "opportunity", "raw", "processed"])("freezes %s at tuition and annual loan decisions", boundary => {
  const id = start();
  inject(boundary === "young" ? { ...newLongTermYoung(), cropMonth: 6, payments: [{ month: 1, weightHundredths: 100 }] } : ready());
  if (boundary === "raw" || boundary === "processed") expect(state().fundCropProduction(id, "harvesting")).toBe(true);
  if (boundary === "processed") expect(state().fundCropProduction(id, "dryingMilling")).toBe(true);
  const random = vi.spyOn(Math, "random").mockReturnValue(0);
  useGameStore.setState({ children: [{ id: "student", stage: "adult_child", gender: "male", isStudying: true,
    tuitionDecision: "pending", maturity: { timeTokens: 4, timeTokensMax: 4 }, education: { progress: 0, progressMax: 4 } }] });
  const before = state(); state().advanceWorldTime(); expect(state()).toBe(before);
  useGameStore.setState({ children: [], month: 12, quarter: 4, loans: [createLoan(state().lands[0], 1)] });
  const crops = state().crops;
  state().advanceWorldTime(); expect(state().month).toBe(12); expect(state().crops).toBe(crops);
  const pending = state(); state().advanceWorldTime(); expect(state()).toBe(pending);
  expect(random).not.toHaveBeenCalled();
  expect(state().carryOverLoan(state().loans[0].id)).toBe(true);
  state().advanceWorldTime(); expect(state()).toMatchObject({ year: 2, month: 1 });
  expect(state().crops).not.toBe(crops);
});

it("keeps multiple coffee crops independent while ticking all six kinds across December", () => {
  const a = start(); const b = start(1); inject(ready(), a); inject(newCoffeeAdult({ year: 1, month: 11 }), b);
  const others = [createCrop("rubber", "r", 1, 1), createCrop("fruit", "f", 1, 1), createCrop("coconut", "c", 1, 1), createCrop("rice", "i", 1, 1), createCrop("corn", "m", 1, 1)];
  useGameStore.setState({ month: 11, quarter: 4, crops: [...state().crops, ...others] });
  const second = tree(b);
  expect(state().fundCropProduction(a, "harvesting")).toBe(true);
  expect(state().fundCropProduction(a, "dryingMilling")).toBe(true);
  expect(tree(b)).toBe(second);
  state().advanceWorldTime(); expect(state().month).toBe(12);
  expect(tree(a).lifecycle).toMatchObject({ progress: 0, payments: [], batch: { stage: "driedMilled" } });
  expect(tree(b).lifecycle).toMatchObject({ progress: 0, payments: [], batch: null, opportunity: null });
  expect(state().fundAllCoffeeMaintenance(b)).toBe(true);
  expect(tree(a).lifecycle).toMatchObject({ payments: [] });
  others.forEach((crop, i) => expect(state().crops[i + 2]).toBe(crop));
});
