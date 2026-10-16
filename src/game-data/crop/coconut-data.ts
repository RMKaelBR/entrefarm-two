import type { Currency } from "../types";
import { gold } from "../money/calculate-money";
import type { CoconutDevelopmentTask, CoconutProductionTask } from "./crop-types";

export const COCONUT_CARD = {
  seedlingCost: gold(1),
  developmentCosts: { clearing: gold(1), hauling: gold(1), planting: gold(1) } satisfies Record<CoconutDevelopmentTask, Currency>,
  youngTokens: 32,
  maintenanceSlots: 8,
  periodMonths: 6,
  regularTokenMonths: 3,
  maintenanceCost: gold(1),
  adultTokens: 1,
  readyMonth: 3,
  monthTwoChance: 0.75,
  productionCosts: { climbingPiling: gold(1), husking: gold(1), hauling: gold(2) } satisfies Record<CoconutProductionTask, Currency>,
  readyYield: { high: 3, low: 2 },
  fallenYield: { high: 2, low: 1 },
} as const;
