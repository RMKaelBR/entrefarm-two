import { gold } from "../money/calculate-money";
import type { Currency } from "../types";
import type {
  CoconutDevelopmentTask, CoconutProductionTask, RubberDevelopmentTask, RubberProductionTask,
  FruitDevelopmentTask, FruitProductionTask, LongTermCropDefinition,
} from "./crop-types";

export const LONG_TERM_RULES = {
  monthsPerGrowthToken: 3,
  developmentMaintenancePeriodMonths: 6,
  maintenanceCost: gold(1),
} as const;

export const YOUNG_PAYMENT_WEIGHTS = [100, 100, 90, 90, 75, 75] as const;

type CardInput = Omit<LongTermCropDefinition, keyof typeof LONG_TERM_RULES | "productionCycleMonths">;

export function defineLongTermCrop<const T extends CardInput>(input: T) {
  return {
    ...input,
    ...LONG_TERM_RULES,
    productionCycleMonths: input.productionTokens * LONG_TERM_RULES.monthsPerGrowthToken,
  };
}

export const COCONUT_CARD = defineLongTermCrop({
  seedlingCost: gold(1),
  developmentCosts: { siteClearing: gold(1), seedlingHauling: gold(1), planting: gold(1) } satisfies Record<CoconutDevelopmentTask, Currency>,
  developmentTokens: 32,
  developmentMaintenanceSlots: 8,
  productionTokens: 1,
  productionMaintenanceSlots: 1,
  monthTwoChance: 0.75,
  productionCosts: { climbingPiling: gold(1), husking: gold(1), hauling: gold(2) } satisfies Record<CoconutProductionTask, Currency>,
  readyYield: { high: 3, low: 2 },
  fallenYield: { high: 2, low: 1 },
});

export const FRUIT_CARD = defineLongTermCrop({
  seedlingCost: gold(2),
  developmentCosts: {
    siteClearing: gold(1), seedlingHauling: gold(1), planting: gold(1),
  } satisfies Record<FruitDevelopmentTask, Currency>,
  developmentTokens: 20,
  developmentMaintenanceSlots: 15,
  productionTokens: 4,
  productionMaintenanceSlots: 3,
  productionCosts: {
    harvesting: gold(7), hauling: gold(3),
  } satisfies Record<FruitProductionTask, Currency>,
  readyYield: { high: 12, low: 8 },
  overripeYield: { high: 3, low: 2 },
});

export const RUBBER_CARD = defineLongTermCrop({
  seedlingCost: gold(2),
  developmentCosts: {
    siteClearing: gold(1), seedlingHauling: gold(1), planting: gold(1),
  } satisfies Record<RubberDevelopmentTask, Currency>,
  developmentTokens: 16,
  developmentMaintenanceSlots: 15,
  productionTokens: 1,
  productionMaintenanceSlots: 1,
  productionCosts: {
    tapping: gold(1), hauling: gold(1),
  } satisfies Record<RubberProductionTask, Currency>,
  readyYield: { high: 3, low: 2 },
  lateYield: 1,
});
