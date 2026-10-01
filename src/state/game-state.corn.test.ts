import { beforeEach, describe, expect, it } from "vitest";
import { createCrop, getCashCropStage } from "@/game-data/crop/crop-functions";
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
  const land = state().lands.find((item) => item.origin === "plains");
  if (!land) throw new Error("Missing Plains fixture");
  expect(state().startCropPlanting("corn", land.id)).toBe(true);
  const crop = state().crops.find((item) => item.landId === land.id);
  if (!crop) throw new Error("Missing planted crop");
  return crop.id;
};
const develop = (id: string) => {
  expect(state().fundCropDevelopment(id, "plowing")).toBe(true);
  expect(state().fundCropDevelopment(id, "planting")).toBe(true);
};
const produce = (id: string) => {
  for (const [task, cost] of [["picking", 2], ["shelling", 1], ["hauling", 2], ["drying", 3]] as const) {
    const gold = state().wallet.gold;
    expect(state().fundCropProduction(id, task)).toBe(true);
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
  it("accepts additional Plains and Riverlands independently", () => {
    const second = createLand("plains");
    useGameStore.setState({ lands: [...state().lands, second] });
    expect(state().startCropPlanting("corn", second.id)).toBe(true);
    expect(state().startCropPlanting("corn", state().lands[0].id)).toBe(true);
    rejected(() => state().startCropPlanting("corn", "unknown"));
    const id = start();
    expect(state().wallet.gold).toBe(17);
    expect(state().cropPlantingHistory[2]).toMatchObject({ cropId: id, kind: "corn" });
    rejected(() => state().startCropPlanting("corn", second.id));
  });

  it.each([false, true])("accepts cleared Plains with irrigation=%s", (isIrrigated) => {
    useGameStore.setState({ lands: [{ ...createLand("plains"), origin: "plains", category: "plains", isCleared: true, isIrrigated }] });
    start();
  });

  it("rejects missing, uncleared, or occupied Plains without charging", () => {
    useGameStore.setState({ lands: [] });
    rejected(() => state().startCropPlanting("corn", "missing"));
    const land = { ...createLand("plains"), origin: "plains", category: "plains", isCleared: false, isIrrigated: false } as const;
    useGameStore.setState({ lands: [land] });
    rejected(() => state().startCropPlanting("corn", land.id));
    useGameStore.setState({ lands: [{ ...land, isCleared: true }], crops: [createCrop("rice", land.id, 1, 1)] });
    rejected(() => state().startCropPlanting("corn", land.id));
  });

  it("requires whole gold and rejects duplicates, invalid tasks and stages", () => {
    useGameStore.setState({ wallet: { gold: 0, silver: 9 } });
    rejected(() => state().startCropPlanting("corn", state().lands[1].id));
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    const id = start();
    rejected(() => state().fundCropMaintenance(id));
    rejected(() => state().fundCropProduction(id, "picking"));
    rejected(() => state().harvestCrop(id));
    rejected(() => state().fundCropDevelopment("unknown", "plowing"));
    // Exercise runtime boundaries that JavaScript callers can reach.
    // @ts-expect-error Deliberately invalid task
    rejected(() => state().fundCropDevelopment(id, "toString"));
    rejected(() => state().fundCropProduction(id, "harvesting"));
    useGameStore.setState({ wallet: { gold: 1, silver: 9 } });
    rejected(() => state().fundCropDevelopment(id, "plowing"));
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    expect(state().fundCropDevelopment(id, "plowing")).toBe(true);
    expect(state().wallet.gold).toBe(18);
    rejected(() => state().fundCropDevelopment(id, "plowing"));
    expect(state().fundCropDevelopment(id, "planting")).toBe(true);
    expect(state().wallet.gold).toBe(17);
    state().advanceWorldTime();
    useGameStore.setState({ wallet: { gold: 0, silver: 9 } });
    rejected(() => state().fundCropMaintenance(id));
    state().advanceWorldTime();
    rejected(() => state().fundCropMaintenance(id));
    rejected(() => state().fundCropProduction(id, "picking"));
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    expect(state().fundCropProduction(id, "picking")).toBe(true);
    rejected(() => state().fundCropProduction(id, "picking"));
    rejected(() => state().harvestCrop(id));
  });

  it("dispatches shared actions by stored kind and rejects incompatible tasks at maturity", () => {
    const cornId = start();
    expect(state().startCropPlanting("rice", state().lands[0].id)).toBe(true);
    const riceId = state().crops.find((crop) => crop.kind === "rice")?.id;
    if (!riceId) throw new Error("Missing rice");
    for (const id of [cornId, riceId]) develop(id);
    state().advanceWorldTime();
    state().advanceWorldTime();
    rejected(() => state().fundCropProduction(riceId, "picking"));
    rejected(() => state().fundCropProduction(riceId, "shelling"));
    rejected(() => state().fundCropProduction(cornId, "harvesting"));
    for (const id of [cornId, riceId]) {
      // @ts-expect-error Deliberate JavaScript runtime input.
      rejected(() => state().fundCropProduction(id, "toString"));
      // @ts-expect-error Deliberate JavaScript runtime input.
      rejected(() => state().fundCropProduction(id, "unknown"));
    }
    const rice = state().crops.find((crop) => crop.id === riceId);
    const before = state().wallet.gold;
    expect(state().fundCropProduction(cornId, "hauling")).toBe(true);
    expect(state().wallet.gold).toBe(before - 2);
    expect(state().crops.find((crop) => crop.id === riceId)).toBe(rice);
    expect(state().fundCropProduction(riceId, "hauling")).toBe(true);
    expect(state().wallet.gold).toBe(before - 3);
    rejected(() => state().fundCropDevelopment("unknown", "plowing"));
    rejected(() => state().fundCropMaintenance("unknown"));
    rejected(() => state().fundCropProduction("unknown", "hauling"));
    rejected(() => state().harvestCrop("unknown"));
    // @ts-expect-error Deliberate JavaScript runtime input.
    rejected(() => state().startCropPlanting("toString", state().lands[0].id));
  });
});

describe("corn harvest and independent time", () => {
  it.each([0, 1, 2, 3, 4])("settles maintenance=%i once, retaining produce and requiring replant purchase", (maintenance) => {
    const rice = createCrop("rice", state().lands[0].id, 1, 1);
    const held = [{ id: "held-rice", crop: "rice" }, { id: "held-corn", crop: "corn" }] as const;
    useGameStore.setState({ crops: [rice], produceInventory: [...held] });
    const id = start();
    develop(id);
    state().advanceWorldTime();
    for (let i = 0; i < maintenance; i++) expect(state().fundCropMaintenance(id)).toBe(true);
    if (maintenance === 4) rejected(() => state().fundCropMaintenance(id));
    state().advanceWorldTime();
    produce(id);
    const ready = corn();
    for (let i = 0; i < 14; i++) state().advanceWorldTime();
    expect(corn()).toBe(ready);
    rejected(() => state().startCropPlanting("corn", ready.landId));
    expect(state().harvestCrop(id)).toBe(true);
    expect(state().wallet.gold).toBe(8 - maintenance);
    expect(state().bank).toEqual({ gold: 7, silver: 0 });
    expect(state().crops).toEqual([rice]);
    expect(state().produceInventory.slice(0, 2)).toEqual(held);
    expect(state().produceInventory.filter((token) => token.crop === "corn")).toHaveLength(1 + (maintenance === 4 ? 6 : 4));
    expect(new Set(state().produceInventory.map((token) => token.id)).size).toBe(state().produceInventory.length);
    rejected(() => state().harvestCrop(id));
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
    state().startCropPlanting("rice", state().lands[0].id);
    const rice = state().crops[0];
    state().fundCropDevelopment(rice.id, "plowing");
    state().fundCropDevelopment(rice.id, "planting");
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
    state().harvestCrop(id);
    expect(state().crops).toEqual([matureRice]);
  });

  it("does not progress either crop when December loan decisions block time", () => {
    const id = start();
    develop(id);
    state().startCropPlanting("rice", state().lands[0].id);
    const rice = state().crops.find((crop) => crop.kind === "rice");
    if (!rice) throw new Error("Missing rice");
    state().fundCropDevelopment(rice.id, "plowing");
    state().fundCropDevelopment(rice.id, "planting");
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
    useGameStore.setState({ crops: [createCrop("corn", "p", 1, 1), createCrop("rice", "r", 1, 1)], produceInventory: [{ id: "c", crop: "corn" }, { id: "r", crop: "rice" }], cropPlantingHistory: [{ cropId: "c", kind: "corn", landId: "p", year: 1 }] });
    state()[action]();
    expect(state()).toMatchObject({ crops: [], produceInventory: [], cropPlantingHistory: [], wallet: { gold: 20, silver: 0 } });
  });
});

describe("shared transaction boundaries", () => {
  it.each(["rice", "corn"] as const)("keeps every %s payment atomic and charges exact costs", (kind) => {
    const land = state().lands[kind === "rice" ? 0 : 1];
    useGameStore.setState({ wallet: { gold: 0, silver: 9 } });
    rejected(() => state().startCropPlanting(kind, land.id));
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    expect(state().startCropPlanting(kind, land.id)).toBe(true);
    expect(state().wallet.gold).toBe(19);
    const id = state().crops[0].id;
    for (const [task, cost] of [["plowing", 2], ["planting", 1]] as const) {
      useGameStore.setState({ wallet: { gold: cost - 1, silver: 9 } });
      rejected(() => state().fundCropDevelopment(id, task));
      useGameStore.setState({ wallet: { gold: cost, silver: 9 } });
      expect(state().fundCropDevelopment(id, task)).toBe(true);
      expect(state().wallet).toEqual({ gold: 0, silver: 9 });
      rejected(() => state().fundCropDevelopment(id, task));
    }
    state().advanceWorldTime();
    rejected(() => state().fundCropMaintenance(id));
    useGameStore.setState({ wallet: { gold: 4, silver: 9 } });
    for (let i = 0; i < 4; i++) {
      expect(state().fundCropMaintenance(id)).toBe(true);
      expect(state().wallet.gold).toBe(3 - i);
    }
    useGameStore.setState({ wallet: { gold: 20, silver: 9 } });
    rejected(() => state().fundCropMaintenance(id));
    state().advanceWorldTime();
    const tasks = kind === "rice"
      ? [["harvesting", 1], ["hauling", 1], ["drying", 2]] as const
      : [["picking", 2], ["shelling", 1], ["hauling", 2], ["drying", 3]] as const;
    for (const [task, cost] of tasks) {
      rejected(() => state().harvestCrop(id));
      useGameStore.setState({ wallet: { gold: cost - 1, silver: 9 } });
      rejected(() => state().fundCropProduction(id, task));
      useGameStore.setState({ wallet: { gold: cost, silver: 9 } });
      expect(state().fundCropProduction(id, task)).toBe(true);
      expect(state().wallet).toEqual({ gold: 0, silver: 9 });
      rejected(() => state().fundCropProduction(id, task));
    }
    const before = state();
    expect(state().harvestCrop(id)).toBe(true);
    expect(state().wallet).toBe(before.wallet);
    expect(state().bank).toBe(before.bank);
    expect(state().cropPlantingHistory).toBe(before.cropPlantingHistory);
    expect(state().produceInventory).toHaveLength(kind === "rice" ? 5 : 6);
    rejected(() => state().harvestCrop(id));
  });
});
