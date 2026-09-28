import { describe, expect, it } from "vitest";
import { createLand } from "../land/land-functions";
import { RICE_CARD } from "./crop-data";
import {
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
  isEligibleRiceRiverland,
  isCashCropDeveloped,
  isCropProductionPaid,
  prepareCropDevelopment,
  prepareCropProduction,
  tickCashCropMaturity,
} from "./crop-functions";
import type { CropPlantingRecord } from "./crop-types";

describe("irrigated rice rules", () => {
  it("accepts riverland and rejects other land presets", () => {
    expect(isEligibleRiceRiverland(createLand("riverlands"))).toBe(true);
    expect(isEligibleRiceRiverland(createLand("plains"))).toBe(false);
    expect(isEligibleRiceRiverland(createLand("forestedPlains"))).toBe(false);
    expect(isEligibleRiceRiverland(createLand("foothills"))).toBe(false);
  });

  it("requires whole gold instead of converting silver", () => {
    expect(hasWholeGold({ gold: 1, silver: 0 }, RICE_CARD.seedCost)).toBe(true);
    expect(hasWholeGold({ gold: 0, silver: 9 }, RICE_CARD.seedCost)).toBe(false);
    expect(hasWholeGold({ gold: 1, silver: 9 }, RICE_CARD.developmentCosts.plowing)).toBe(false);
  });

  it("marks development immutably and ignores repeated funding", () => {
    const crop = createCrop("rice", "land-1", 1, 1);
    const plowed = prepareCropDevelopment(crop, "plowing")!.crop;
    const developed = prepareCropDevelopment(plowed, "planting")!.crop;

    expect(crop.development.plowing).toBe(false);
    expect(isCashCropDeveloped(plowed)).toBe(false);
    expect(isCashCropDeveloped(developed)).toBe(true);
    expect(prepareCropDevelopment(developed, "planting")).toBeNull();
  });

  it("advances developed crops through three stages and keeps mature crops ready", () => {
    const incomplete = [createCrop("rice", "land-1", 1, 12)];
    expect(tickCashCropMaturity(incomplete)).toBe(incomplete);
    expect(getCashCropStage(incomplete[0])).toBe("preparation");
    const developed = prepareCropDevelopment(
      prepareCropDevelopment(incomplete[0], "plowing")!.crop, "planting",
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
    const ready = { ...crop, development: { plowing: true, planting: true }, maturity: { timeTokens: 1, timeTokensMax: 2 } };
    expect(prepareCropMaintenance(crop)).toBeNull();
    const once = prepareCropMaintenance(ready)!.crop;
    const twice = prepareCropMaintenance(once)!.crop;
    const three = prepareCropMaintenance(twice)!.crop;
    const four = prepareCropMaintenance(three)!.crop;

    expect(getCropYield(crop)).toBe(3);
    expect(getCropYield(three)).toBe(3);
    expect(getCropYield(four)).toBe(5);
    expect(prepareCropMaintenance(four)).toBeNull();
  });

  it("tracks every required production task", () => {
    const crop = createCrop("rice", "land-1", 1, 1);
    const mature = { ...crop, development: { plowing: true, planting: true }, maturity: { timeTokens: 2, timeTokensMax: 2 } };
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
  it("allows every cleared terrain regardless of the temporary assignment", () => {
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
      expect(prepareCropDevelopment(crop, task)).toBeNull();
      expect(prepareCropProduction(mature, task)).toBeNull();
    }
    for (let maintenancePaid = 0; maintenancePaid <= 4; maintenancePaid++) {
      expect(getCropYield({ ...crop, maintenancePaid })).toBe(
        kind === "rice" ? (maintenancePaid === 4 ? 5 : 3) : (maintenancePaid === 4 ? 6 : 4),
      );
    }
    expect(createCropProduce(kind, 3).every((token) => token.crop === kind)).toBe(true);
  });
  it("requires each rice placement property", () => {
    const land = createLand("riverlands");
    expect(isEligibleRiceRiverland({ ...land, origin: "riverlands", category: "plains", isCleared: false, isIrrigated: false })).toBe(false);
    expect(isEligibleRiceRiverland({ ...land, isIrrigated: false })).toBe(false);
  });
});
