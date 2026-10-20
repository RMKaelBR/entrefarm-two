import { defineLongTermCrop } from "./long-term-crop-data";
import { gold } from "../money/calculate-money";
import type { Currency } from "../types";
import type { FruitDevelopmentTask, FruitProductionTask } from "./crop-types";

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
