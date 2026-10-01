import { beforeEach, describe, expect, it } from "vitest";
import { CROP_DEFINITIONS } from "@/game-data/crop/crop-definitions";
import { getCropPlacementBlockReason } from "@/game-data/crop/crop-functions";
import type { CropKind } from "@/game-data/crop/crop-types";
import { clearLand, createLand, irrigateLand } from "@/game-data/land/land-functions";
import { LAND_ORIGINS } from "@/game-data/land/land-types";
import { useGameStore } from "./game-state";

const state = () => useGameStore.getState();
const cropById = (id: string) => {
  const crop = state().crops.find((item) => item.id === id);
  if (!crop) throw new Error("Missing crop fixture");
  return crop;
};
function startOn(kind: CropKind, landId: string) {
  expect(state().startCropPlanting(kind, landId)).toBe(true);
  const crop = state().crops.find((item) => item.landId === landId);
  if (!crop) throw new Error("Expected crop on requested parcel");
  expect(crop.kind).toBe(kind);
  return crop.id;
}
function develop(id: string) {
  expect(state().fundCropDevelopment(id, "plowing")).toBe(true);
  expect(state().fundCropDevelopment(id, "planting")).toBe(true);
}
function produce(id: string) {
  const tasks = cropById(id).kind === "rice"
    ? ["harvesting", "hauling", "drying"] as const
    : ["picking", "shelling", "hauling", "drying"] as const;
  for (const task of tasks) expect(state().fundCropProduction(id, task)).toBe(true);
}
function rejected(action: () => boolean) {
  const before = state();
  expect(action()).toBe(false);
  expect(state()).toBe(before);
}
beforeEach(() => useGameStore.setState({
  year: 1, quarter: 1, month: 1, wallet: { gold: 100, silver: 0 },
  bank: { gold: 0, silver: 0 }, lands: [createLand("plains"), createLand("plains")],
  crops: [], cropPlantingHistory: [], produceInventory: [], loans: [], children: [], hasActiveGame: true,
}));

describe.each(["rice", "corn"] as const)("%s parcel selection", (kind) => {
  it("agrees with placement reasons across terrain, clearing, and irrigation", () => {
    for (const origin of LAND_ORIGINS) {
      const base = createLand(origin);
      for (const land of [base, clearLand(base), irrigateLand(clearLand(base))]) {
        useGameStore.setState({ lands: [land], crops: [] });
        const allowed = land.isCleared && (kind === "corn" || land.category === "plains");
        expect(getCropPlacementBlockReason(kind, land) === null).toBe(allowed);
        if (allowed) startOn(kind, land.id);
        else rejected(() => state().startCropPlanting(kind, land.id));
      }
    }
  });

  it("rejects unknown, unaffordable, repeated, and occupied purchases atomically", () => {
    const land = state().lands[0];
    rejected(() => state().startCropPlanting(kind, "missing"));
    useGameStore.setState({ wallet: { gold: 0, silver: 9 } });
    rejected(() => state().startCropPlanting(kind, land.id));
    useGameStore.setState({ wallet: { gold: 100, silver: 9 } });
    startOn(kind, land.id);
    rejected(() => state().startCropPlanting(kind, land.id));
    rejected(() => state().startCropPlanting(kind === "rice" ? "corn" : "rice", land.id));
    for (const invalid of ["unknown", "toString", "__proto__"]) {
      // @ts-expect-error Deliberate invalid JavaScript input.
      rejected(() => state().startCropPlanting(invalid, state().lands[1].id));
    }
  });

  it("keeps staggered same-kind development, maintenance, production, and harvest independent", () => {
    const a = startOn(kind, state().lands[0].id);
    const b = startOn(kind, state().lands[1].id);
    const untouched = cropById(b);
    develop(a);
    expect(cropById(b)).toBe(untouched);
    state().advanceWorldTime();
    expect(cropById(a).maturity.timeTokens).toBe(1);
    expect(cropById(b)).toBe(untouched);
    expect(state().fundCropMaintenance(a)).toBe(true);
    expect(cropById(b)).toBe(untouched);
    develop(b);
    state().advanceWorldTime();
    expect(cropById(a).maturity.timeTokens).toBe(2);
    expect(cropById(b).maturity.timeTokens).toBe(1);
    const other = cropById(b);
    produce(a);
    expect(cropById(b)).toBe(other);
    expect(state().harvestCrop(a)).toBe(true);
    expect(state().crops).toEqual([other]);
    expect(cropById(b)).toBe(other);
    expect(state().produceInventory.every((token) => token.crop === kind)).toBe(true);
  });

  it("harvests and purchases the other kind on the same parcel with fresh state", () => {
    const land = state().lands[0];
    const id = startOn(kind, land.id);
    develop(id);
    state().advanceWorldTime();
    expect(state().fundCropMaintenance(id)).toBe(true);
    state().advanceWorldTime();
    produce(id);
    expect(state().harvestCrop(id)).toBe(true);
    expect(state().crops).toEqual([]);
    const inventory = state().produceInventory;
    expect(inventory.length).toBeGreaterThan(0);
    expect(inventory.every((token) => token.crop === kind)).toBe(true);
    const nextKind = kind === "rice" ? "corn" : "rice";
    const gold = state().wallet.gold;
    const nextId = startOn(nextKind, land.id);
    expect(nextId).not.toBe(id);
    expect(state().wallet.gold).toBe(gold - CROP_DEFINITIONS[nextKind].purchaseCost.gold);
    const next = cropById(nextId);
    expect(next).toMatchObject({ purchasing: { seedsPaid: true }, development: { plowing: false, planting: false }, maintenancePaid: 0, maturity: { timeTokens: 0 } });
    expect(Object.values(next.production).every((paid) => !paid)).toBe(true);
    if (next.kind === "rice") expect(next.irrigationBonus).toBeNull();
    expect(state().produceInventory).toBe(inventory);
    expect(state().cropPlantingHistory).toHaveLength(2);
  });
});
