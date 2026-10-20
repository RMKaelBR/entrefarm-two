import { gold } from "../money/calculate-money";
import type { Currency } from "../types";
import type { FruitDevelopmentTask, FruitProductionTask, LongTermCropDefinition } from "./crop-types";

const shared = {
  seedlingCost: gold(2),
  developmentCosts: {
    siteClearing: gold(1), hauling: gold(1), planting: gold(1),
  } satisfies Record<FruitDevelopmentTask, Currency>,
  developmentTokens: 20,
  developmentMaintenanceSlots: 15,
  developmentMaintenancePeriodMonths: 6,
  monthsPerGrowthToken: 3,
  maintenanceCost: gold(1),
  productionTokens: 4,
  productionMaintenanceSlots: 3,
  get productionCycleMonths(): number {
    return this.productionTokens * this.monthsPerGrowthToken;
  },
} as const satisfies LongTermCropDefinition;

export const FRUIT_CARD = {
  ...shared,
  productionCosts: {
    harvesting: gold(7), hauling: gold(3),
  } satisfies Record<FruitProductionTask, Currency>,
  readyYield: { high: 12, low: 8 },
  overripeYield: { high: 3, low: 2 },
} as const;
