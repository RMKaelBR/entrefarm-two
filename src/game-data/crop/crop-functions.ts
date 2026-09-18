import type { Land } from "../land/land-types";
import type { Currency } from "../types";
import { RICE_CARD } from "./crop-data";
import type {
  CropPlantingRecord,
  ProduceToken,
  RiceCrop,
  RiceDevelopmentTask,
  RiceProductionTask,
} from "./crop-types";

export const hasWholeGold = (wallet: Currency, cost: Currency) =>
  cost.silver === 0 && wallet.gold >= cost.gold;

export const isEligibleRiceRiverland = (land: Land) =>
  land.origin === "riverlands"
  && land.category === "plains"
  && land.isCleared
  && land.isIrrigated;

export const isRiceDeveloped = (crop: RiceCrop) =>
  crop.purchasing.seedsPaid
  && crop.development.plowing
  && crop.development.planting;

export const isRiceMature = (crop: RiceCrop) =>
  crop.maturity.timeTokens >= crop.maturity.timeTokensMax;

// Only completed preparation starts the clock; each successful month advance
// moves planting -> maintenance -> harvest, where progress stays capped.
export const getRiceStage = (crop: RiceCrop) => {
  if (!isRiceDeveloped(crop)) return "preparation";
  if (isRiceMature(crop)) return "harvest";
  return crop.maturity.timeTokens === 0 ? "planting" : "maintenance";
};

export const isRiceProductionPaid = (crop: RiceCrop) =>
  Object.values(crop.production).every(Boolean);

export const countRicePlantingsForYear = (
  history: CropPlantingRecord[],
  year: number,
) => history.filter((item) => item.kind === "rice" && item.year === year).length;

export const createRiceCrop = (
  landId: Land["id"],
  year: number,
  month: number,
): RiceCrop => ({
  id: crypto.randomUUID(),
  kind: "rice",
  landId,
  startedYear: year,
  startedMonth: month,
  purchasing: { seedsPaid: true },
  development: { plowing: false, planting: false },
  maintenancePaid: 0,
  maturity: { timeTokens: 0, timeTokensMax: RICE_CARD.maturityTokens },
  production: { harvesting: false, hauling: false, drying: false },
});

export function markRiceDevelopmentPaid(
  crop: RiceCrop,
  task: RiceDevelopmentTask,
): RiceCrop {
  if (crop.development[task]) return crop;

  return {
    ...crop,
    development: { ...crop.development, [task]: true },
  };
}

export function addRiceMaintenance(crop: RiceCrop): RiceCrop {
  if (crop.maintenancePaid >= RICE_CARD.maintenanceSpaces) return crop;

  return { ...crop, maintenancePaid: crop.maintenancePaid + 1 };
}

export function markRiceProductionPaid(
  crop: RiceCrop,
  task: RiceProductionTask,
): RiceCrop {
  if (crop.production[task]) return crop;

  return {
    ...crop,
    production: { ...crop.production, [task]: true },
  };
}

export function tickRiceMaturity(
  crops: RiceCrop[],
): RiceCrop[] {
  let changed = false;
  const next = crops.map((crop) => {
    if (!isRiceDeveloped(crop) || isRiceMature(crop)) return crop;

    changed = true;
    return {
      ...crop,
      maturity: {
        ...crop.maturity,
        timeTokens: Math.min(
          crop.maturity.timeTokens + 1,
          crop.maturity.timeTokensMax,
        ),
      },
    };
  });

  return changed ? next : crops;
}

export const getRiceYield = (crop: RiceCrop) =>
  crop.maintenancePaid === RICE_CARD.maintenanceSpaces
    ? RICE_CARD.highYield
    : RICE_CARD.lowYield;

export const createRiceProduce = (quantity: number): ProduceToken[] =>
  Array.from({ length: quantity }, () => ({
    id: crypto.randomUUID(),
    crop: "rice" as const,
  }));
