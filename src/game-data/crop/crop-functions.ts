import type { Land } from "../land/land-types";
import type { Currency } from "../types";
import { CROP_CARDS } from "./crop-data";
import type { CashCrop, CashCropBase, CropKind, CropPlantingRecord, ProduceToken } from "./crop-types";

export const hasWholeGold = (wallet: Currency, cost: Currency) =>
  cost.silver === 0 && wallet.gold >= cost.gold;

export const isEligibleRiceLand = (land: Land) =>
  land.category === "plains" && land.isCleared;

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

const assertNever = (value: never): never => {
  throw new Error(`Unhandled crop kind: ${String(value)}`);
};

export const isCropKind = (value: unknown): value is CropKind =>
  value === "rice" || value === "corn";

// Temporary assignment; general eligibility is independent of parcel origin.
export const getAssignedCornLand = (lands: Land[]) =>
  lands.find((land) => land.origin === "plains");
export const isEligibleCornLand = (land: Land) => land.isCleared;

export function canPlantCropOnLand(kind: CropKind, land: Land, lands: Land[]): boolean {
  switch (kind) {
    case "rice": return isEligibleRiceLand(land);
    case "corn": return getAssignedCornLand(lands)?.id === land.id && isEligibleCornLand(land);
    default: return assertNever(kind);
  }
}

export function createCrop(kind: CropKind, landId: Land["id"], year: number, month: number): CashCrop {
  const common = {
    id: crypto.randomUUID(), landId, startedYear: year, startedMonth: month,
    purchasing: { seedsPaid: true },
    development: { plowing: false, planting: false },
    maintenancePaid: 0,
    maturity: { timeTokens: 0, timeTokensMax: CROP_CARDS[kind].growthAdvancesToHarvest },
  } satisfies CashCropBase;
  switch (kind) {
    case "rice": return { ...common, kind, irrigationBonus: null, production: { harvesting: false, hauling: false, drying: false } };
    case "corn": return { ...common, kind, production: { picking: false, shelling: false, hauling: false, drying: false } };
    default: return assertNever(kind);
  }
}

function hasOwnStringKey<T extends object>(object: T, key: unknown): key is Extract<keyof T, string> {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(object, key);
}

export const isDevelopmentTask = (task: unknown) => hasOwnStringKey(CROP_CARDS.rice.developmentCosts, task);
export const isRiceProductionTask = (task: unknown) => hasOwnStringKey(CROP_CARDS.rice.productionCosts, task);
export const isCornProductionTask = (task: unknown) => hasOwnStringKey(CROP_CARDS.corn.productionCosts, task);

type CropPayment = { crop: CashCrop; cost: Currency };

export function prepareCropDevelopment(
  crop: CashCrop,
  task: unknown,
  parcelIsIrrigated: boolean | undefined,
): CropPayment | null {
  const costs = CROP_CARDS[crop.kind].developmentCosts;
  if (getCashCropStage(crop) !== "preparation" || !hasOwnStringKey(costs, task) || crop.development[task]) return null;
  const next: CashCrop = {
    ...crop,
    development: { ...crop.development, [task]: true },
  };
  // Preparation completion fixes the bonus for this planting, before growth ticks.
  if (next.kind === "rice" && isCashCropDeveloped(next)) {
    if (parcelIsIrrigated === undefined) return null;
    return { cost: costs[task], crop: { ...next, irrigationBonus: parcelIsIrrigated } };
  }
  return { cost: costs[task], crop: next };
}

export function prepareCropMaintenance(crop: CashCrop): CropPayment | null {
  const card = CROP_CARDS[crop.kind];
  if (getCashCropStage(crop) !== "maintenance" || crop.maintenancePaid >= card.maintenanceSpaces) return null;
  return { cost: card.maintenanceSpaceCost, crop: { ...crop, maintenancePaid: crop.maintenancePaid + 1 } };
}

export function prepareCropProduction(crop: CashCrop, task: unknown): CropPayment | null {
  if (!isCashCropMature(crop)) return null;
  switch (crop.kind) {
    case "rice": {
      const costs = CROP_CARDS.rice.productionCosts;
      if (!hasOwnStringKey(costs, task) || crop.production[task]) return null;
      return { cost: costs[task], crop: { ...crop, production: { ...crop.production, [task]: true } } };
    }
    case "corn": {
      const costs = CROP_CARDS.corn.productionCosts;
      if (!hasOwnStringKey(costs, task) || crop.production[task]) return null;
      return { cost: costs[task], crop: { ...crop, production: { ...crop.production, [task]: true } } };
    }
    default: return assertNever(crop);
  }
}

export const isCropProductionPaid = (crop: CashCrop) => Object.values(crop.production).every(Boolean);
export const getCropYield = (crop: CashCrop) => {
  const card = CROP_CARDS[crop.kind];
  const baseYield = crop.maintenancePaid === card.maintenanceSpaces ? card.highYield : card.lowYield;
  const bonus = crop.kind === "rice" && crop.irrigationBonus === true ? 1 : 0;
  return baseYield + bonus;
};
export const createCropProduce = (kind: CropKind, quantity: number): ProduceToken[] =>
  Array.from({ length: quantity }, () => ({ id: crypto.randomUUID(), crop: kind }));
export const countRicePlantingsForYear = (history: CropPlantingRecord[], year: number) =>
  history.filter((item) => item.kind === "rice" && item.year === year).length;
