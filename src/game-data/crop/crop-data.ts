import type { Currency } from "../types";
import type {
  CashCrop,
  CropKind,
  CornDevelopmentTask,
  CornProductionTask,
  RiceDevelopmentTask,
  RiceProductionTask,
} from "./crop-types";

const gold = (amount: number): Currency => ({ gold: amount, silver: 0 });

export const RICE_CARD = {
  seedCost: gold(1),
  developmentCosts: {
    plowing: gold(2),
    planting: gold(1),
  } satisfies Record<RiceDevelopmentTask, Currency>,
  maintenanceSpaceCost: gold(1),
  maintenanceSpaces: 4,
  // Legacy gameplay-step count, not printed card spaces.
  maturityTokens: 2,
  sourceMaturitySpaces: 1,
  growthAdvancesToHarvest: 2,
  productionCosts: {
    harvesting: gold(1),
    hauling: gold(1),
    drying: gold(2),
  } satisfies Record<RiceProductionTask, Currency>,
  highYield: 5,
  lowYield: 3,
} as const;

export const CORN_CARD = {
  seedCost: gold(1),
  developmentCosts: {
    plowing: gold(2),
    planting: gold(1),
  } satisfies Record<CornDevelopmentTask, Currency>,
  maintenanceSpaceCost: gold(1),
  maintenanceSpaces: 4,
  sourceMaturitySpaces: 1,
  growthAdvancesToHarvest: 2,
  productionCosts: {
    picking: gold(2),
    shelling: gold(1),
    hauling: gold(2),
    drying: gold(3),
  } satisfies Record<CornProductionTask, Currency>,
  highYield: 6,
  lowYield: 4,
} as const;

type CropOf<K extends CropKind> = Extract<CashCrop, { kind: K }>;
type CropCards = {
  [K in CropKind]: {
    seedCost: Currency;
    developmentCosts: Record<keyof CropOf<K>["development"], Currency>;
    productionCosts: Record<keyof CropOf<K>["production"], Currency>;
    maintenanceSpaceCost: Currency;
    maintenanceSpaces: number;
    sourceMaturitySpaces: number;
    growthAdvancesToHarvest: number;
    highYield: number;
    lowYield: number;
  };
};

export const CROP_CARDS = {
  rice: RICE_CARD,
  corn: CORN_CARD,
} satisfies CropCards;
