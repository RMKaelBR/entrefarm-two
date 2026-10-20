import { LONG_TERM_RULES, YOUNG_PAYMENT_WEIGHTS } from "./long-term-crop-data";
import type { Currency } from "../types";
import type { LongTermPreparation, LongTermDevelopmentTrack, LongTermDevelopmentTask, LongTermCropDefinition, MaintenancePayment } from "./crop-types";

export const maintenanceWeightTotal = (payments: readonly MaintenancePayment[]) =>
  payments.reduce((total, payment) => total + payment.weightHundredths, 0);

export const maintenanceChance = (
  payments: readonly MaintenancePayment[], slots: number,
) => maintenanceWeightTotal(payments) / (slots * 100);

export const productionProgressAfterAdvance = (
  progress: number, arrivalMonth: number, target: number, cadence: number,
) => Math.min(target, progress + (arrivalMonth % cadence === 0 ? 1 : 0));

export type RandomSource = () => number;
export const succeeds = (chance: number, random: RandomSource) =>
  chance >= 1 || (chance > 0 && random() < chance);

type StatePayment<T> = { state: T; cost: Currency };

export const newLongTermPreparation = (): LongTermPreparation => ({
  phase: "development",
  development: { siteClearing: false, seedlingHauling: false, planting: false },
});

export const newLongTermYoung = (): LongTermDevelopmentTrack => ({
  phase: "young", cropMonth: 1, regularTokens: 0, bonusTokens: 0, payments: [],
});

const isPreparationTask = (task: unknown): task is LongTermDevelopmentTask =>
  task === "siteClearing" || task === "seedlingHauling" || task === "planting";

export function prepareLongTermPreparation(
  life: LongTermPreparation,
  costs: LongTermCropDefinition["developmentCosts"],
  task: unknown,
): StatePayment<LongTermPreparation | LongTermDevelopmentTrack> | null {
  if (!isPreparationTask(task) || life.development[task]) return null;
  const development = { ...life.development, [task]: true };
  return {
    cost: { ...costs[task] },
    state: Object.values(development).every(Boolean)
      ? newLongTermYoung() : { ...life, development },
  };
}

export const youngPeriodMonth = (month: number) =>
  ((month - 1) % LONG_TERM_RULES.developmentMaintenancePeriodMonths) + 1;

export function youngPaymentWeight(month: number): 100 | 90 | 75 {
  const weight = YOUNG_PAYMENT_WEIGHTS[youngPeriodMonth(month) - 1];
  if (weight === undefined) throw new Error("Invalid young crop month");
  return weight;
}

export const youngBonusChance = (young: LongTermDevelopmentTrack, slots: number) =>
  maintenanceChance(young.payments, slots);

export const developmentProgress = (young: LongTermDevelopmentTrack, target: number) =>
  Math.min(target, young.regularTokens + young.bonusTokens);

export function prepareYoungMaintenance(
  young: LongTermDevelopmentTrack, slots: number, mode: "one" | "all" = "one",
): StatePayment<LongTermDevelopmentTrack> | null {
  const remaining = slots - young.payments.length;
  if (remaining <= 0) return null;
  const count = mode === "all" ? remaining : 1;
  const unitCost = LONG_TERM_RULES.maintenanceCost;
  return {
    cost: { gold: unitCost.gold * count, silver: unitCost.silver * count },
    state: {
      ...young,
      payments: [...young.payments, ...Array.from({ length: count }, () => ({
        month: young.cropMonth, weightHundredths: youngPaymentWeight(young.cropMonth),
      }))],
    },
  };
}

export function advanceYoungTrack(
  young: LongTermDevelopmentTrack, slots: number, random: RandomSource,
): LongTermDevelopmentTrack {
  let next = { ...young, cropMonth: young.cropMonth + 1 };
  if (young.cropMonth % LONG_TERM_RULES.developmentMaintenancePeriodMonths === 0) {
    next = {
      ...next,
      bonusTokens: next.bonusTokens + (succeeds(youngBonusChance(young, slots), random) ? 1 : 0),
      payments: [],
    };
  }
  if (next.cropMonth % LONG_TERM_RULES.monthsPerGrowthToken === 0) {
    next = { ...next, regularTokens: next.regularTokens + 1 };
  }
  return next;
}
