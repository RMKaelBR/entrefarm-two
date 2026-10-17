import { gold } from "../money/calculate-money";
import type { Currency } from "../types";
import type { FruitDevelopmentTask, FruitProductionTask } from "./crop-types";

export const FRUIT_CARD = {
  seedlingCost: gold(2),
  developmentCosts: {
    siteClearing: gold(1), hauling: gold(1), planting: gold(1),
  } satisfies Record<FruitDevelopmentTask, Currency>,
  youngTokens: 20,
  youngMaintenanceSlots: 15,
  periodMonths: 6,
  regularTokenMonths: 3,
  maintenanceCost: gold(1),
  adultTokens: 4,
  adultMaintenanceSlots: 3,
  productionCosts: {
    harvesting: gold(7), hauling: gold(3),
  } satisfies Record<FruitProductionTask, Currency>,
  readyYield: { high: 12, low: 8 },
  overripeYield: { high: 3, low: 2 },
} as const;
