import type { Currency } from "../types";
import type {
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
  maturityTokens: 2,
  productionCosts: {
    harvesting: gold(1),
    hauling: gold(1),
    drying: gold(2),
  } satisfies Record<RiceProductionTask, Currency>,
  highYield: 5,
  lowYield: 3,
} as const;
