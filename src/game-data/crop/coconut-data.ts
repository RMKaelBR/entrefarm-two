import type { Currency } from "../types";
import { gold } from "../money/calculate-money";
import type { CoconutDevelopmentTask, CoconutProductionTask, LongTermCropDefinition } from "./crop-types";

const shared = {
  seedlingCost: gold(1),
  developmentCosts: { siteClearing: gold(1), hauling: gold(1), planting: gold(1) } satisfies Record<CoconutDevelopmentTask, Currency>,
  developmentTokens: 32,
  developmentMaintenanceSlots: 8,
  developmentMaintenancePeriodMonths: 6,
  monthsPerGrowthToken: 3,
  maintenanceCost: gold(1),
  productionTokens: 1,
  productionMaintenanceSlots: 1,
  get productionCycleMonths(): number {
    return this.productionTokens * this.monthsPerGrowthToken;
  },
} as const satisfies LongTermCropDefinition;

export const COCONUT_CARD = {
  ...shared,
  monthTwoChance: 0.75,
  productionCosts: { climbingPiling: gold(1), husking: gold(1), hauling: gold(2) } satisfies Record<CoconutProductionTask, Currency>,
  readyYield: { high: 3, low: 2 },
  fallenYield: { high: 2, low: 1 },
} as const;
