import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCrop } from "@/game-data/crop/crop-functions";
import { newCacaoAdult, tickCacaoAdult } from "@/game-data/crop/cacao-functions";
import { newLongTermYoung } from "@/game-data/crop/long-term-crop-functions";
import { createProduceInventory } from "@/game-data/crop/produce-functions";
import { makeYield } from "@/game-data/yield/calculate-yield";
import { createLand } from "@/game-data/land/land-functions";
import { LAND_ORIGINS } from "@/game-data/land/land-types";
import { createLoan } from "@/game-data/loan/loan-functions";
import type { CacaoCrop } from "@/game-data/crop/crop-types";
import { useGameStore } from "./game-state";

const state = () => useGameStore.getState();
function tree(id = state().crops[0].id) {
  const crop = state().crops.find(c => c.id === id);
  if (!crop || crop.kind !== "cacao") throw Error("Expected cacao");
  return crop;
}
function inject(lifecycle: CacaoCrop["lifecycle"], id = tree().id) {
  useGameStore.setState({ crops: state().crops.map(c => c.id === id ? { ...tree(id), lifecycle } : c) });
}
function rejected(action: () => boolean) {
  const before = state(); expect(action()).toBe(false); expect(state()).toBe(before);
}
function start(index = 0) {
  expect(state().startCropPlanting("cacao", state().lands[index].id)).toBe(true);
  return state().crops.at(-1)!.id;
}
function ready() {
  let life = newCacaoAdult();
  life.payments = Array.from({ length: 5 }, () => ({ month: 1, weightHundredths: 100 }));
  while (life.adultMonth < 6) life = tickCacaoAdult(life, () => { throw Error("No draw for full care"); });
  return life;
}
beforeEach(() => useGameStore.setState({
  year: 1, month: 1, quarter: 1, wallet: { gold: 1000, silver: 9 }, bank: { gold: 7, silver: 3 },
  lands: LAND_ORIGINS.map(createLand), crops: [], cropPlantingHistory: [], produceInventory: createProduceInventory(),
  children: [], loans: [], hasActiveGame: true,
}));
afterEach(() => vi.restoreAllMocks());

it("charges seven gold for purchase/preparation and keeps the parcel and planting history", () => {
  const id = start(); const before = state();
  for (const task of ["siteClearing", "seedlingHauling", "planting"] as const) {
    const wallet = state().wallet;
    useGameStore.setState({ wallet: { gold: 0, silver: 99 } });
    rejected(() => state().fundCropDevelopment(id, task));
    useGameStore.setState({ wallet });
    expect(state().fundCropDevelopment(id, task)).toBe(true);
    rejected(() => state().fundCropDevelopment(id, task));
  }
  expect(tree().lifecycle).toEqual(newLongTermYoung());
  expect(before.wallet.gold).toBe(996);
  expect(state().wallet.gold).toBe(993);
  expect(state().lands).toBe(before.lands);
  expect(state().cropPlantingHistory).toBe(before.cropPlantingHistory);
});

it.each(["young", "adult"])("funds %s care atomically, retains stored weights and rejects wrong IDs", phase => {
  useGameStore.setState({ wallet: { gold: 3, silver: 99 } });
  rejected(() => state().startCropPlanting("cacao", state().lands[0].id));
  useGameStore.setState({ wallet: { gold: 100, silver: 9 } });
  const id = start();
  rejected(() => state().fundAllCacaoMaintenance(id));
  rejected(() => state().fundAllCacaoMaintenance("missing"));
  const wrong = createCrop("rice", "other", 1, 1);
  useGameStore.setState({ crops: [...state().crops, wrong] });
  rejected(() => state().fundAllCacaoMaintenance(wrong.id));
  inject(phase === "young" ? newLongTermYoung() : newCacaoAdult());
  useGameStore.setState({ wallet: { gold: 0, silver: 99 } });
  rejected(() => state().fundCropMaintenance(id));
  useGameStore.setState({ wallet: { gold: 100, silver: 9 } });
  expect(state().fundCropMaintenance(id)).toBe(true);
  const life = tree().lifecycle;
  if (life.phase === "development") throw Error("Expected growth");
  inject(life.phase === "young" ? { ...life, cropMonth: 5 } : { ...life, cycleMonth: 4, adultMonth: 4 });
  const cost = phase === "young" ? 3 : 4;
  useGameStore.setState({ wallet: { gold: cost - 1, silver: 99 } });
  rejected(() => state().fundAllCacaoMaintenance(id));
  useGameStore.setState({ wallet: { gold: cost, silver: 9 } });
  expect(state().fundAllCacaoMaintenance(id)).toBe(true);
  expect(state().wallet).toEqual({ gold: 0, silver: 9 });
  expect(tree().lifecycle).toMatchObject({ payments: [
    { month: 1, weightHundredths: 100 }, ...Array.from({ length: cost }, () => ({ month: phase === "young" ? 5 : 4, weightHundredths: 75 })),
  ] });
  rejected(() => state().fundAllCacaoMaintenance(id));
});

it.each([0, 1])("credits inventory exactly once on hauling after %s months and preserves held fractions", delay => {
  const id = start(); inject(ready());
  if (delay) state().advanceWorldTime();
  const before = state();
  useGameStore.setState({ produceInventory: { ...createProduceInventory(), cacao: makeYield(0, delay ? 9 : 8) } });
  const inventory = state().produceInventory;
  rejected(() => state().collectCropProduce(id));
  rejected(() => state().fundCropProduction(id, "hauling"));
  for (const task of ["harvesting", "splittingFermentingDrying", "hauling"] as const) {
    useGameStore.setState({ wallet: { gold: 0, silver: 99 } });
    rejected(() => state().fundCropProduction(id, task));
    useGameStore.setState({ wallet: { gold: 10, silver: 9 } });
    expect(state().fundCropProduction(id, task)).toBe(true);
    expect(state().wallet).toEqual({ gold: 9, silver: 9 });
    rejected(() => state().fundCropProduction(id, task));
    if (task !== "hauling") expect(state().produceInventory).toBe(inventory);
  }
  expect(state().produceInventory.cacao).toEqual(makeYield(1));
  expect(state().cropPlantingHistory).toBe(before.cropPlantingHistory);
  expect(state().bank).toBe(before.bank);
  rejected(() => state().collectCropProduce(id));
  rejected(() => state().startCropPlanting("cacao", tree().landId));
  const held = state().produceInventory;
  for (let i = 0; i < 14; i++) state().advanceWorldTime();
  expect(state().produceInventory).toBe(held);
});

it.each(["young", "opportunity", "raw", "processed"])("freezes %s at tuition and loan decisions and ticks once on year rollover", boundary => {
  const id = start();
  inject(boundary === "young" ? { ...newLongTermYoung(), cropMonth: 6, payments: [{ month: 1, weightHundredths: 100 }] } : ready());
  if (boundary === "raw" || boundary === "processed") expect(state().fundCropProduction(id, "harvesting")).toBe(true);
  if (boundary === "processed") expect(state().fundCropProduction(id, "splittingFermentingDrying")).toBe(true);
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
  expect(tree().lifecycle).toMatchObject(boundary === "young" ? { cropMonth: 7, bonusTokens: 1, payments: [] }
    : { adultMonth: 7, cycleMonth: 1, batch: null });
  expect(random).toHaveBeenCalledTimes(boundary === "young" ? 1 : 0);
});

it("keeps staggered cacao and other crops independent", () => {
  const a = start(); const b = start(1); inject(ready(), a); inject(newCacaoAdult(1), b);
  const other = createCrop("coffee", "other", 1, 1);
  useGameStore.setState({ crops: [...state().crops, other] });
  const second = tree(b);
  expect(state().fundCropProduction(a, "harvesting")).toBe(true);
  expect(tree(b)).toBe(second);
  state().advanceWorldTime();
  expect(tree(a).lifecycle).toMatchObject({ adultMonth: 7, cycleMonth: 1, batch: null });
  expect(tree(b).lifecycle).toMatchObject({ adultMonth: 2, progress: 1 });
  expect(state().crops[2]).toBe(other);
  expect(state().fundAllCacaoMaintenance(b)).toBe(true);
  expect(tree(a).lifecycle).toMatchObject({ payments: [] });
});
