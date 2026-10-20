import { gold } from "../money/calculate-money";
import type { LongTermCropDefinition } from "./crop-types";

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
