import { beforeEach, describe, expect, it } from "vitest";
import { createCrop } from "@/game-data/crop/crop-functions";
import { createProduceInventory } from "@/game-data/crop/produce-functions";
import { newBananaAdultCycle } from "@/game-data/crop/banana-functions";
import { makeYield } from "@/game-data/yield/calculate-yield";
import { createLand } from "@/game-data/land/land-functions";
import { useGameStore } from "./game-state";

const state = () => useGameStore.getState();
const started = () => {
  const id = state().crops[0]?.id;
  if (!id) throw new Error("Expected banana crop");
  return id;
};
beforeEach(() => useGameStore.setState({ year: 1, quarter: 1, month: 12, wallet: { gold: 50, silver: 0 }, bank: { gold: 0, silver: 0 }, lands: [createLand("forestedPlains")], crops: [], cropPlantingHistory: [], produceInventory: createProduceInventory(), loans: [], children: [], hasActiveGame: true }));

describe("banana game state", () => {
  it("charges seedling and preparation costs without clearing land", () => {
    const land = state().lands[0];
    expect(state().startCropPlanting("banana", land.id)).toBe(true);
    const id = started();
    expect(state().wallet.gold).toBe(44);
    expect(state().fundCropDevelopment(id, "siteClearing")).toBe(true);
    expect(state().fundCropDevelopment(id, "seedlingHauling")).toBe(true);
    expect(state().fundCropDevelopment(id, "planting")).toBe(true);
    expect(state().wallet.gold).toBe(40);
    expect(state().lands[0]).toBe(land);
    expect(state().crops[0].lifecycle.phase).toBe("young");
  });

  it("ticks banana crop months across December and expires an unharvested Month 3", () => {
    expect(state().startCropPlanting("banana", state().lands[0].id)).toBe(true);
    const crop = state().crops[0];
    const young = { ...crop, lifecycle: { phase: "young" as const, cropMonth: 1, regularTokens: 0, bonusTokens: 0, payments: [] } };
    useGameStore.setState({ crops: [young] });
    state().advanceWorldTime();
    expect(state().month).toBe(1);
    expect(state().crops[0].lifecycle).toMatchObject({ phase: "young", cropMonth: 2 });
    const ready = { ...newBananaAdultCycle(), stage: "ready" as const, cycleMonth: 3 as const, progress: 1, yieldResult: "low" as const, fromOverflow: true };
    useGameStore.setState({ crops: [{ ...young, lifecycle: ready }] });
    state().advanceWorldTime();
    expect(state().crops[0].lifecycle).toMatchObject({ phase: "adult", stage: "growing", cycleMonth: 1, payments: [], batch: null });
    expect(state().fundCropProduction(crop.id, "harvesting")).toBe(false);
  });

  it("funds all care atomically and transfers hauled yield exactly once", () => {
    expect(state().startCropPlanting("banana", state().lands[0].id)).toBe(true);
    const id = started();
    const crop = createCrop("banana", "land", 1, 1);
    const young = { ...crop, id, landId: state().lands[0].id, lifecycle: { phase: "young" as const, cropMonth: 1, regularTokens: 0, bonusTokens: 0, payments: [] } };
    useGameStore.setState({ crops: [young], wallet: { gold: 10, silver: 0 } });
    expect(state().fundAllBananaMaintenance(id)).toBe(false);
    expect(state().crops[0]).toBe(young);
    useGameStore.setState({ wallet: { gold: 11, silver: 0 } });
    expect(state().fundAllBananaMaintenance(id)).toBe(true);
    const fundedCrop = state().crops[0];
    expect(fundedCrop.lifecycle.phase).toBe("young");
    if (fundedCrop.lifecycle.phase === "young") expect(fundedCrop.lifecycle.payments).toHaveLength(11);
    expect(state().wallet.gold).toBe(0);
    const ready = { ...newBananaAdultCycle(), stage: "ready" as const, cycleMonth: 3 as const, progress: 1, yieldResult: "high" as const, fromOverflow: false };
    useGameStore.setState({ crops: [{ ...young, lifecycle: ready }], wallet: { gold: 10, silver: 0 } });
    expect(state().fundCropProduction(id, "hauling")).toBe(false);
    expect(state().fundCropProduction(id, "harvesting")).toBe(true);
    expect(state().fundCropProduction(id, "hauling")).toBe(true);
    expect(state().produceInventory.banana).toEqual(makeYield(7));
    expect(state().fundCropProduction(id, "hauling")).toBe(false);
    expect(state().produceInventory.banana).toEqual(makeYield(7));
  });
});
