import { defineLongTermCrop } from "./long-term-crop-data";
import type { Currency } from "../types";
import { gold } from "../money/calculate-money";
import type { CoconutDevelopmentTask, CoconutProductionTask } from "./crop-types";

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
