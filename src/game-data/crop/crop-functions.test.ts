import { describe, expect, it } from "vitest";
import { clearLand, irrigateLand, createLand } from "../land/land-functions";
import { RICE_CARD } from "./crop-data";
import {
  canPlantCropOnLand,
  isCropKind,
  isEligibleCornLand,
  isCornProductionTask,
  isRiceProductionTask,
  isDevelopmentTask,
  prepareCropMaintenance,
  countRicePlantingsForYear,
  createCrop,
  createCropProduce,
  getCashCropStage,
  getCropYield,
  hasWholeGold,
  isEligibleRiceLand,
  isCashCropDeveloped,
  isCropProductionPaid,
  prepareCropDevelopment,
  prepareCropProduction,
  tickCashCropMaturity,
} from "./crop-functions";
import type { CropPlantingRecord } from "./crop-types";

describe("irrigated rice rules", () => {
  it("accepts cleared lowland and rejects uncleared forest and upland", () => {
    expect(isEligibleRiceLand(createLand("riverlands"))).toBe(true);
    expect(isEligibleRiceLand(createLand("plains"))).toBe(true);
    expect(isEligibleRiceLand(createLand("forestedPlains"))).toBe(false);
    expect(isEligibleRiceLand(createLand("foothills"))).toBe(false);
  });

  it("requires whole gold instead of converting silver", () => {
    expect(hasWholeGold({ gold: 1, silver: 0 }, RICE_CARD.seedCost)).toBe(true);
    expect(hasWholeGold({ gold: 0, silver: 9 }, RICE_CARD.seedCost)).toBe(false);
    expect(hasWholeGold({ gold: 1, silver: 9 }, RICE_CARD.developmentCosts.plowing)).toBe(false);
  });

  it("marks development immutably and ignores repeated funding", () => {
    const crop = createCrop("rice", "land-1", 1, 1);
    const plowed = prepareCropDevelopment(crop, "plowing", true)!.crop;
    const developed = prepareCropDevelopment(plowed, "planting", true)!.crop;

    expect(crop.development.plowing).toBe(false);
    expect(isCashCropDeveloped(plowed)).toBe(false);
    expect(isCashCropDeveloped(developed)).toBe(true);
    expect(prepareCropDevelopment(developed, "planting", true)).toBeNull();
  });

  it("advances developed crops through three stages and keeps mature crops ready", () => {
    const incomplete = [createCrop("rice", "land-1", 1, 12)];
    expect(tickCashCropMaturity(incomplete)).toBe(incomplete);
    expect(getCashCropStage(incomplete[0])).toBe("preparation");
    const developed = prepareCropDevelopment(
      prepareCropDevelopment(incomplete[0], "plowing", true)!.crop, "planting", true,
    )!.crop;
    expect(getCashCropStage(developed)).toBe("planting");
    const maintenance = tickCashCropMaturity([developed]);
    expect(getCashCropStage(maintenance[0])).toBe("maintenance");
    expect(developed.maturity.timeTokens).toBe(0);
    const mature = tickCashCropMaturity(maintenance);
    expect(getCashCropStage(mature[0])).toBe("harvest");
    expect(tickCashCropMaturity(mature)).toBe(mature);
  });

  it("caps maintenance and selects low or high yield", () => {
    const crop = createCrop("rice", "land-1", 1, 1);
    const ready = { ...crop, irrigationBonus: true, development: { plowing: true, planting: true }, maturity: { timeTokens: 1, timeTokensMax: 2 } };
    expect(prepareCropMaintenance(crop)).toBeNull();
    const once = prepareCropMaintenance(ready)!.crop;
    const twice = prepareCropMaintenance(once)!.crop;
    const three = prepareCropMaintenance(twice)!.crop;
    const four = prepareCropMaintenance(three)!.crop;

    expect(getCropYield(crop)).toBe(2);
    expect(getCropYield(three)).toBe(3);
    expect(getCropYield(four)).toBe(5);
    expect(prepareCropMaintenance(four)).toBeNull();
  });

  it("tracks every required production task", () => {
    const crop = createCrop("rice", "land-1", 1, 1);
    const mature = { ...crop, irrigationBonus: true, development: { plowing: true, planting: true }, maturity: { timeTokens: 2, timeTokensMax: 2 } };
    expect(prepareCropProduction(crop, "harvesting")).toBeNull();
    const harvesting = prepareCropProduction(mature, "harvesting")!.crop;
    const hauling = prepareCropProduction(harvesting, "hauling")!.crop;
    const drying = prepareCropProduction(hauling, "drying")!.crop;

    expect(isCropProductionPaid(hauling)).toBe(false);
    expect(isCropProductionPaid(drying)).toBe(true);
    expect(prepareCropProduction(drying, "drying")).toBeNull();
  });

  it("counts only rice planting records from the requested year", () => {
    const history: CropPlantingRecord[] = [
      { cropId: "crop-1", kind: "rice", landId: "land-1", year: 1 },
      { cropId: "crop-2", kind: "rice", landId: "land-1", year: 1 },
      { cropId: "crop-3", kind: "rice", landId: "land-1", year: 2 },
    ];

    expect(countRicePlantingsForYear(history, 1)).toBe(2);
    expect(countRicePlantingsForYear(history, 2)).toBe(1);
  });

  it("creates unique crop-identified produce tokens", () => {
    const produce = createCropProduce("rice", 5);
    expect(produce).toHaveLength(5);
    expect(produce.every((token) => token.crop === "rice")).toBe(true);
    expect(new Set(produce.map((token) => token.id)).size).toBe(5);
  });
});

describe("corn eligibility and task boundaries", () => {
  it("allows every cleared terrain without a parcel assignment", () => {
    for (const origin of ["foothills", "plains", "riverlands"] as const) {
      expect(isEligibleCornLand(createLand(origin))).toBe(true);
    }
    const forest = createLand("forestedPlains");
    expect(isEligibleCornLand(forest)).toBe(false);
    expect(isEligibleCornLand({ ...forest, origin: "forestedPlains", category: "plains", isCleared: true, isIrrigated: false })).toBe(true);
  });
  it("rejects unknown or cross-crop task values", () => {
    for (const value of [undefined, null, {}, "toString", "unknown"]) {
      expect(isDevelopmentTask(value)).toBe(false);
      expect(isCornProductionTask(value)).toBe(false);
      expect(isRiceProductionTask(value)).toBe(false);
    }
    expect(isCornProductionTask("harvesting")).toBe(false);
    expect(isRiceProductionTask("picking")).toBe(false);
    expect(isRiceProductionTask("shelling")).toBe(false);
  });
});

describe("shared crop definitions", () => {
  it.each(["rice", "corn"] as const)("preserves %s yields and rejects invalid task keys", (kind) => {
    const crop = createCrop(kind, "land", 1, 1);
    const mature = { ...crop, maturity: { timeTokens: 2, timeTokensMax: 2 } };
    for (const task of [undefined, null, {}, "unknown", "toString", "__proto__"]) {
      expect(prepareCropDevelopment(crop, task, undefined)).toBeNull();
      expect(prepareCropProduction(mature, task)).toBeNull();
    }
    for (let maintenancePaid = 0; maintenancePaid <= 4; maintenancePaid++) {
      expect(getCropYield({ ...crop, maintenancePaid })).toBe(
        kind === "rice" ? (maintenancePaid === 4 ? 4 : 2) : (maintenancePaid === 4 ? 6 : 4),
      );
    }
    expect(createCropProduce(kind, 3).every((token) => token.crop === kind)).toBe(true);
  });
  it("requires each rice placement property", () => {
    const land = createLand("riverlands");
    expect(isEligibleRiceLand({ ...land, origin: "riverlands", category: "plains", isCleared: false, isIrrigated: false })).toBe(false);
    expect(isEligibleRiceLand({ ...land, isIrrigated: false })).toBe(true);
  });
});


describe("rice lowland and snapshot boundaries", () => {
  it.each(["plains", "riverlands", "forestedPlains"] as const)("accepts cleared %s with either irrigation status", (origin) => {
    const land = createLand(origin);
    for (const isIrrigated of [false, true]) {
      expect(isEligibleRiceLand({ ...land, origin, category: "plains", isCleared: true, isIrrigated })).toBe(true);
    }
  });

  it("requires explicit parcel status to finish rice but not corn", () => {
    for (const kind of ["rice", "corn"] as const) {
      const crop = createCrop(kind, "parcel", 1, 1);
      const first = prepareCropDevelopment(crop, "plowing", undefined)!.crop;
      const result = prepareCropDevelopment(first, "planting", undefined);
      if (kind === "rice") {
        expect(result).toBeNull();
        expect(first).toMatchObject({ irrigationBonus: null, development: { planting: false } });
      } else {
        expect(result?.crop).not.toHaveProperty("irrigationBonus");
        expect(result?.crop.development.planting).toBe(true);
      }
    }
  });
});


describe("registered placement rules", () => {
  it("recognizes only implemented crop kinds", () => {
    for (const kind of ["rice", "corn"]) expect(isCropKind(kind)).toBe(true);
    for (const value of ["toString", "__proto__", "unknown", "", null, undefined, {}]) {
      expect(isCropKind(value)).toBe(false);
    }
  });
  it.each(["rice", "corn"] as const)("validates %s terrain and supported irrigation states", (kind) => {
    for (const origin of ["riverlands", "plains", "forestedPlains", "foothills"] as const) {
      const base = createLand(origin);
      for (const land of [base, clearLand(base), irrigateLand(clearLand(base))]) {
        expect(canPlantCropOnLand(kind, land)).toBe(
          land.isCleared && (kind === "corn" || land.category === "plains"),
        );
      }
    }
  });
});
