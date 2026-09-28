import { describe, expect, it } from "vitest";
import { createLand } from "../land/land-functions";
import { RICE_CARD } from "./crop-data";
import {
  isEligibleCornLand,
  isCornProductionTask,
  isRiceProductionTask,
  isDevelopmentTask,
  addRiceMaintenance,
  countRicePlantingsForYear,
  createRiceCrop,
  createRiceProduce,
  getRiceStage,
  getRiceYield,
  hasWholeGold,
  isEligibleRiceRiverland,
  isRiceDeveloped,
  isRiceProductionPaid,
  markRiceDevelopmentPaid,
  markRiceProductionPaid,
  tickRiceMaturity,
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
    const crop = createRiceCrop("land-1", 1, 1);
    const plowed = markRiceDevelopmentPaid(crop, "plowing");
    const developed = markRiceDevelopmentPaid(plowed, "planting");

    expect(crop.development.plowing).toBe(false);
    expect(isRiceDeveloped(plowed)).toBe(false);
    expect(isRiceDeveloped(developed)).toBe(true);
    expect(markRiceDevelopmentPaid(developed, "planting")).toBe(developed);
  });

  it("advances developed crops through three stages and keeps mature crops ready", () => {
    const incomplete = [createRiceCrop("land-1", 1, 12)];
    expect(tickRiceMaturity(incomplete)).toBe(incomplete);
    expect(getRiceStage(incomplete[0])).toBe("preparation");
    const developed = markRiceDevelopmentPaid(
      markRiceDevelopmentPaid(incomplete[0], "plowing"), "planting",
    );
    expect(getRiceStage(developed)).toBe("planting");
    const maintenance = tickRiceMaturity([developed]);
    expect(getRiceStage(maintenance[0])).toBe("maintenance");
    expect(developed.maturity.timeTokens).toBe(0);
    const mature = tickRiceMaturity(maintenance);
    expect(getRiceStage(mature[0])).toBe("harvest");
    expect(tickRiceMaturity(mature)).toBe(mature);
  });

  it("caps maintenance and selects low or high yield", () => {
    const crop = createRiceCrop("land-1", 1, 1);
    const once = addRiceMaintenance(crop);
    const twice = addRiceMaintenance(once);
    const three = addRiceMaintenance(twice);
    const four = addRiceMaintenance(three);

    expect(getRiceYield(crop)).toBe(3);
    expect(getRiceYield(three)).toBe(3);
    expect(getRiceYield(four)).toBe(5);
    expect(addRiceMaintenance(four)).toBe(four);
  });

  it("tracks every required production task", () => {
    const crop = createRiceCrop("land-1", 1, 1);
    const harvesting = markRiceProductionPaid(crop, "harvesting");
    const hauling = markRiceProductionPaid(harvesting, "hauling");
    const drying = markRiceProductionPaid(hauling, "drying");

    expect(isRiceProductionPaid(hauling)).toBe(false);
    expect(isRiceProductionPaid(drying)).toBe(true);
    expect(markRiceProductionPaid(drying, "drying")).toBe(drying);
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
    const produce = createRiceProduce(5);
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
