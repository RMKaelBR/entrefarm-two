import { beforeEach, describe, expect, it } from "vitest";
import { createCornCrop, createRiceCrop, getAssignedCornLand, getCashCropStage } from "@/game-data/crop/crop-functions";
import { createLand } from "@/game-data/land/land-functions";
import { createLoan } from "@/game-data/loan/loan-functions";
import { useGameStore } from "./game-state";

const state = () => useGameStore.getState();
const corn = () => {
  const crop = state().crops.find((item) => item.kind === "corn");
  if (!crop) throw new Error("Missing corn fixture");
  return crop;
};
const start = () => {
  const land = getAssignedCornLand(state().lands);
  if (!land) throw new Error("Missing Plains fixture");
  expect(state().startCornPlanting(land.id)).toBe(true);
  return corn().id;
};
const develop = (id: string) => {
  expect(state().fundCornDevelopment(id, "plowing")).toBe(true);
  expect(state().fundCornDevelopment(id, "planting")).toBe(true);
};
const produce = (id: string) => {
  for (const [task, cost] of [["picking", 2], ["shelling", 1], ["hauling", 2], ["drying", 3]] as const) {
    const gold = state().wallet.gold;
    expect(state().fundCornProduction(id, task)).toBe(true);
    expect(state().wallet.gold).toBe(gold - cost);
  }
};
const rejected = (action: () => boolean) => {
  const before = state();
  expect(action()).toBe(false);
  expect(state()).toBe(before);
};

beforeEach(() => useGameStore.setState({
  year: 1, quarter: 1, month: 1, wallet: { gold: 20, silver: 0 },
  bank: { gold: 7, silver: 0 }, lands: [createLand("riverlands"), createLand("plains")],
  crops: [], cropPlantingHistory: [], produceInventory: [], loans: [], children: [], hasActiveGame: true,
}));

describe("corn placement and payments", () => {
  it("uses only the first owned Plains, independent of irrigation", () => {
    const second = createLand("plains");
    useGameStore.setState({ lands: [...state().lands, second] });
    rejected(() => state().startCornPlanting(second.id));
    rejected(() => state().startCornPlanting(state().lands[0].id));
    rejected(() => state().startCornPlanting("unknown"));
    const id = start();
    expect(state().wallet.gold).toBe(19);
    expect(state().cropPlantingHistory[0]).toMatchObject({ cropId: id, kind: "corn" });
    rejected(() => state().startCornPlanting(corn().landId));
  });

  it.each([false, true])("accepts cleared Plains with irrigation=%s", (isIrrigated) => {
    useGameStore.setState({ lands: [{ ...createLand("plains"), origin: "plains", category: "plains", isCleared: true, isIrrigated }] });
    start();
  });

  it("rejects missing, uncleared, or occupied Plains without charging", () => {
    useGameStore.setState({ lands: [] });
    rejected(() => state().startCornPlanting("missing"));
    const land = { ...createLand("plains"), origin: "plains", category: "plains", isCleared: false, isIrrigated: false } as const;
    useGameStore.setState({ lands: [land] });
    rejected(() => state().startCornPlanting(land.id));
    useGameStore.setState({ lands: [{ ...land, isCleared: true }], crops: [createRiceCrop(land.id, 1, 1)] });
    rejected(() => state().startCornPlanting(land.id));
  });

  it("requires whole gold and rejects duplicates, invalid tasks and stages", () => {
    useGameStore.setState({ wallet: { gold: 0, silver: 9 } });
    rejected(() => state().startCornPlanting(state().lands[1].id));
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    const id = start();
    rejected(() => state().fundCornMaintenance(id));
    rejected(() => state().fundCornProduction(id, "picking"));
    rejected(() => state().harvestCorn(id));
    rejected(() => state().fundCornDevelopment("unknown", "plowing"));
    // Exercise runtime boundaries that JavaScript callers can reach.
    // @ts-expect-error Deliberately invalid task
    rejected(() => state().fundCornDevelopment(id, "toString"));
    // @ts-expect-error Deliberately invalid task
    rejected(() => state().fundCornProduction(id, "harvesting"));
    useGameStore.setState({ wallet: { gold: 1, silver: 9 } });
    rejected(() => state().fundCornDevelopment(id, "plowing"));
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    expect(state().fundCornDevelopment(id, "plowing")).toBe(true);
    expect(state().wallet.gold).toBe(18);
    rejected(() => state().fundCornDevelopment(id, "plowing"));
    expect(state().fundCornDevelopment(id, "planting")).toBe(true);
    expect(state().wallet.gold).toBe(17);
    state().advanceWorldTime();
    useGameStore.setState({ wallet: { gold: 0, silver: 9 } });
    rejected(() => state().fundCornMaintenance(id));
    state().advanceWorldTime();
    rejected(() => state().fundCornMaintenance(id));
    rejected(() => state().fundCornProduction(id, "picking"));
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    expect(state().fundCornProduction(id, "picking")).toBe(true);
    rejected(() => state().fundCornProduction(id, "picking"));
    rejected(() => state().harvestCorn(id));
  });

  it("rejects every cross-kind action", () => {
    const cornId = start();
    expect(state().startRicePlanting(state().lands[0].id)).toBe(true);
    const riceId = state().crops.find((crop) => crop.kind === "rice")?.id;
    if (!riceId) throw new Error("Missing rice");
    for (const id of [cornId, "unknown"]) {
      rejected(() => state().fundRiceDevelopment(id, "plowing"));
      rejected(() => state().fundRiceMaintenance(id));
      rejected(() => state().fundRiceProduction(id, "hauling"));
      rejected(() => state().harvestRice(id));
    }
    for (const id of [riceId, "unknown"]) {
      rejected(() => state().fundCornDevelopment(id, "plowing"));
      rejected(() => state().fundCornMaintenance(id));
      rejected(() => state().fundCornProduction(id, "hauling"));
      rejected(() => state().harvestCorn(id));
    }
  });
});

describe("corn harvest and independent time", () => {
  it.each([0, 1, 2, 3, 4])("settles maintenance=%i once, retaining produce and requiring replant purchase", (maintenance) => {
    const rice = createRiceCrop(state().lands[0].id, 1, 1);
    const held = [{ id: "held-rice", crop: "rice" }, { id: "held-corn", crop: "corn" }] as const;
    useGameStore.setState({ crops: [rice], produceInventory: [...held] });
    const id = start();
    develop(id);
    state().advanceWorldTime();
    for (let i = 0; i < maintenance; i++) expect(state().fundCornMaintenance(id)).toBe(true);
    if (maintenance === 4) rejected(() => state().fundCornMaintenance(id));
    state().advanceWorldTime();
    produce(id);
    const ready = corn();
    for (let i = 0; i < 14; i++) state().advanceWorldTime();
    expect(corn()).toBe(ready);
    rejected(() => state().startCornPlanting(ready.landId));
    expect(state().harvestCorn(id)).toBe(true);
    expect(state().wallet.gold).toBe(8 - maintenance);
    expect(state().bank).toEqual({ gold: 7, silver: 0 });
    expect(state().crops).toEqual([rice]);
    expect(state().produceInventory.slice(0, 2)).toEqual(held);
    expect(state().produceInventory.filter((token) => token.crop === "corn")).toHaveLength(1 + (maintenance === 4 ? 6 : 4));
    expect(new Set(state().produceInventory.map((token) => token.id)).size).toBe(state().produceInventory.length);
    rejected(() => state().harvestCorn(id));
    start();
    expect(corn()).toMatchObject({ development: { plowing: false, planting: false }, maintenancePaid: 0, maturity: { timeTokens: 0 }, production: { picking: false, shelling: false, hauling: false, drying: false } });
    expect(corn().id).not.toBe(id);
    expect(state().wallet.gold).toBe(7 - maintenance);
  });

  it.each(Array.from({ length: 12 }, (_, i) => i + 1))("starts preparation in month %i", (month) => {
    useGameStore.setState({ month, quarter: Math.ceil(month / 3) });
    const id = start();
    state().advanceWorldTime();
    state().advanceWorldTime();
    expect(getCashCropStage(corn())).toBe("preparation");
    develop(id);
    expect(getCashCropStage(corn())).toBe("planting");
    state().advanceWorldTime();
    expect(getCashCropStage(corn())).toBe("maintenance");
    state().advanceWorldTime();
    expect(getCashCropStage(corn())).toBe("harvest");
  });

  it("staggered rice and corn cross December independently", () => {
    useGameStore.setState({ month: 12, quarter: 4, wallet: { gold: 40, silver: 0 } });
    state().startRicePlanting(state().lands[0].id);
    const rice = state().crops[0];
    state().fundRiceDevelopment(rice.id, "plowing");
    state().fundRiceDevelopment(rice.id, "planting");
    const id = start();
    state().advanceWorldTime();
    expect(state()).toMatchObject({ month: 1, year: 2 });
    develop(id);
    state().advanceWorldTime();
    expect(state().crops.map(getCashCropStage)).toEqual(["harvest", "maintenance"]);
    state().advanceWorldTime();
    expect(state().crops.map(getCashCropStage)).toEqual(["harvest", "harvest"]);
    const matureRice = state().crops[0];
    produce(id);
    state().harvestCorn(id);
    expect(state().crops).toEqual([matureRice]);
  });

  it("does not progress either crop when December loan decisions block time", () => {
    const id = start();
    develop(id);
    state().startRicePlanting(state().lands[0].id);
    const rice = state().crops.find((crop) => crop.kind === "rice");
    if (!rice) throw new Error("Missing rice");
    state().fundRiceDevelopment(rice.id, "plowing");
    state().fundRiceDevelopment(rice.id, "planting");
    useGameStore.setState({ month: 12, quarter: 4, loans: [createLoan(state().lands[0], 1)] });
    const crops = state().crops;
    state().advanceWorldTime();
    expect(state().crops).toBe(crops);
    expect(state().month).toBe(12);
    state().advanceWorldTime();
    expect(state().crops).toBe(crops);
  });

  it("does not progress corn while tuition is unresolved", () => {
    const id = start();
    develop(id);
    useGameStore.setState({ children: [{ id: "student", stage: "adult_child", gender: "male", isStudying: true, tuitionDecision: "pending", maturity: { timeTokens: 4, timeTokensMax: 4 }, education: { progress: 0, progressMax: 4 } }] });
    const before = state();
    state().advanceWorldTime();
    expect(state()).toBe(before);
  });

  it("does not impose an annual cap", () => {
    useGameStore.setState({ cropPlantingHistory: Array.from({ length: 6 }, (_, i) => ({ cropId: `past-${i}`, kind: "corn", landId: state().lands[1].id, year: 1 })) });
    start();
    expect(state().cropPlantingHistory).toHaveLength(7);
  });

  it.each(["startNewGame", "resetAll"] as const)("%s clears mixed crops without planting or charging", (action) => {
    useGameStore.setState({ crops: [createCornCrop("p", 1, 1), createRiceCrop("r", 1, 1)], produceInventory: [{ id: "c", crop: "corn" }, { id: "r", crop: "rice" }], cropPlantingHistory: [{ cropId: "c", kind: "corn", landId: "p", year: 1 }] });
    state()[action]();
    expect(state()).toMatchObject({ crops: [], produceInventory: [], cropPlantingHistory: [], wallet: { gold: 20, silver: 0 } });
  });
});
