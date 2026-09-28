import type { Land } from "../land/land-types";
import type { Currency } from "../types";
import { CORN_CARD, RICE_CARD } from "./crop-data";
import type {
  CashCrop,
  CornCrop,
  CornDevelopmentTask,
  CornProductionTask,
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

export const isCashCropDeveloped = (crop: CashCrop) =>
  crop.purchasing.seedsPaid
  && crop.development.plowing
  && crop.development.planting;

export const isCashCropMature = (crop: CashCrop) =>
  crop.maturity.timeTokens >= crop.maturity.timeTokensMax;

// Only completed preparation starts the clock; each successful month advance
// moves planting -> maintenance -> harvest, where progress stays capped.
export const getCashCropStage = (crop: CashCrop) => {
  if (!isCashCropDeveloped(crop)) return "preparation";
  if (isCashCropMature(crop)) return "harvest";
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
  maturity: { timeTokens: 0, timeTokensMax: RICE_CARD.growthAdvancesToHarvest },
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

export function tickCashCropMaturity<T extends CashCrop>(
  crops: T[],
): T[] {
  let changed = false;
  const next = crops.map((crop): T => {
    if (!isCashCropDeveloped(crop) || isCashCropMature(crop)) return crop;

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

export const isRiceDeveloped = (crop: RiceCrop) => isCashCropDeveloped(crop);
export const isRiceMature = (crop: RiceCrop) => isCashCropMature(crop);
export const getRiceStage = (crop: RiceCrop) => getCashCropStage(crop);
export const tickRiceMaturity = (crops: RiceCrop[]) => tickCashCropMaturity(crops);

// Temporary assignment; general corn eligibility is independent of parcel origin.
export const getAssignedCornLand = (lands: Land[]) =>
  lands.find((land) => land.origin === "plains");
export const isEligibleCornLand = (land: Land) => land.isCleared;

export const isDevelopmentTask = (task: unknown): task is RiceDevelopmentTask =>
  task === "plowing" || task === "planting";
export const isRiceProductionTask = (task: unknown): task is RiceProductionTask =>
  task === "harvesting" || task === "hauling" || task === "drying";
export const isCornProductionTask = (task: unknown): task is CornProductionTask =>
  task === "picking" || task === "shelling" || task === "hauling" || task === "drying";

export const createCornCrop = (landId: Land["id"], year: number, month: number): CornCrop => ({
  id: crypto.randomUUID(),
  kind: "corn",
  landId,
  startedYear: year,
  startedMonth: month,
  purchasing: { seedsPaid: true },
  development: { plowing: false, planting: false },
  maintenancePaid: 0,
  maturity: { timeTokens: 0, timeTokensMax: CORN_CARD.growthAdvancesToHarvest },
  production: { picking: false, shelling: false, hauling: false, drying: false },
});

export function markCornDevelopmentPaid(crop: CornCrop, task: CornDevelopmentTask): CornCrop {
  if (crop.development[task]) return crop;
  return { ...crop, development: { ...crop.development, [task]: true } };
}
export function addCornMaintenance(crop: CornCrop): CornCrop {
  if (crop.maintenancePaid >= CORN_CARD.maintenanceSpaces) return crop;
  return { ...crop, maintenancePaid: crop.maintenancePaid + 1 };
}
export function markCornProductionPaid(crop: CornCrop, task: CornProductionTask): CornCrop {
  if (crop.production[task]) return crop;
  return { ...crop, production: { ...crop.production, [task]: true } };
}
export const isCornProductionPaid = (crop: CornCrop) => Object.values(crop.production).every(Boolean);
export const getCornYield = (crop: CornCrop) =>
  crop.maintenancePaid === CORN_CARD.maintenanceSpaces ? CORN_CARD.highYield : CORN_CARD.lowYield;
export const createCornProduce = (quantity: number): ProduceToken[] =>
  Array.from({ length: quantity }, () => ({ id: crypto.randomUUID(), crop: "corn" }));
