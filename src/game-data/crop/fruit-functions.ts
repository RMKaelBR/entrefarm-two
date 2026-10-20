import { FRUIT_CARD as card } from "./fruit-data";
import type { FruitAdult, FruitCrop, FruitYoung } from "./crop-types";
import type { Currency } from "../types";

type RandomSource = () => number;
type FruitPayment = { crop: FruitCrop; cost: Currency };

export const fruitPeriodMonth = (month: number) =>
  ((month - 1) % card.periodMonths) + 1;

export function fruitYoungPoints(month: number): 100 | 90 | 75 {
  const relative = fruitPeriodMonth(month);
  return relative <= 2 ? 100 : relative <= 4 ? 90 : 75;
}
export const fruitBonusChance = (young: FruitYoung) =>
  young.payments.reduce((sum, p) => sum + p.pointHundredths, 0)
    / (card.youngMaintenanceSlots * 100);

export function fruitAdultWeight(month: number): 100 | 75 | 50 | 25 {
  return month <= 3 ? 100 : month <= 6 ? 75 : month <= 9 ? 50 : 25;
}
export const fruitHighChance = (adult: FruitAdult) =>
  adult.payments.reduce((sum, p) => sum + p.weight, 0)
    / (card.adultMaintenanceSlots * 100);

const succeeds = (chance: number, random: RandomSource) =>
  chance >= 1 || (chance > 0 && random() < chance);

export function newFruitAdultCycle(
  progress = 0,
  lastHarvest: FruitAdult["lastHarvest"] = null,
): FruitAdult {
  return {
    phase: "adult", stage: "growing", cycleMonth: 1, progress,
    payments: [], production: { harvesting: false, hauling: false },
    lastHarvest,
  };
}

const owns = <T extends object>(object: T, key: unknown):
  key is Extract<keyof T, string> =>
  typeof key === "string" && Object.prototype.hasOwnProperty.call(object, key);

export function prepareFruitDevelopment(
  crop: FruitCrop, task: unknown,
): FruitPayment | null {
  const life = crop.lifecycle;
  if (life.phase !== "preparation" || !owns(card.developmentCosts, task)
    || life.development[task]) return null;
  const development = { ...life.development, [task]: true };
  return {
    cost: card.developmentCosts[task],
    crop: { ...crop, lifecycle: Object.values(development).every(Boolean)
      ? { phase: "young", cropMonth: 1, regularTokens: 0,
          bonusTokens: 0, payments: [] }
      : { ...life, development } },
  };
}

export function prepareFruitMaintenance(crop: FruitCrop): FruitPayment | null {
  const life = crop.lifecycle;
  if (life.phase === "preparation") return null;
  if (life.phase === "young") {
    if (life.payments.length >= card.youngMaintenanceSlots) return null;
    return { cost: card.maintenanceCost, crop: { ...crop, lifecycle: {
      ...life, payments: [...life.payments, {
        cropMonth: life.cropMonth,
        pointHundredths: fruitYoungPoints(life.cropMonth),
      }],
    } } };
  }
  if (life.stage !== "growing" || life.cycleMonth > 11
    || life.payments.length >= card.adultMaintenanceSlots) return null;
  return { cost: card.maintenanceCost, crop: { ...crop, lifecycle: {
    ...life, payments: [...life.payments, {
      cycleMonth: life.cycleMonth, weight: fruitAdultWeight(life.cycleMonth),
    }],
  } } };
}
export function prepareFruitFullMaintenance(crop: FruitCrop): FruitPayment | null {
  let payment = prepareFruitMaintenance(crop);
  if (!payment) return null;
  let funded = payment.crop;
  const cost = { ...payment.cost };
  while ((payment = prepareFruitMaintenance(funded))) {
    funded = payment.crop;
    cost.gold += payment.cost.gold;
    cost.silver += payment.cost.silver;
  }
  return { crop: funded, cost };
}

export function matureFruitIfReady(young: FruitYoung): FruitYoung | FruitAdult {
  const total = young.regularTokens + young.bonusTokens;
  return total < card.youngTokens
    ? young
    : newFruitAdultCycle(total - card.youngTokens);
}

export function tickFruitYoung(
  young: FruitYoung, random: RandomSource,
): FruitYoung | FruitAdult {
  let next: FruitYoung = { ...young, cropMonth: young.cropMonth + 1 };
  if (young.cropMonth % card.periodMonths === 0) {
    next = {
      ...next,
      bonusTokens: next.bonusTokens
        + (succeeds(fruitBonusChance(young), random) ? 1 : 0),
      payments: [],
    };
  }
  if (next.cropMonth % card.regularTokenMonths === 0) {
    next = { ...next, regularTokens: next.regularTokens + 1 };
  }
  return matureFruitIfReady(next);
}

export function tickFruitAdult(adult: FruitAdult, random: RandomSource): FruitAdult {
  if (adult.stage === "resting") return newFruitAdultCycle(0, adult.lastHarvest);
  if (adult.stage === "ready") {
    return adult.readyAge === 0
      ? { ...adult, readyAge: 1 }
      : newFruitAdultCycle(0, { outcome: "lost", quantity: 0 });
  }
  const cycleMonth = adult.cycleMonth + 1;
  const progress = Math.min(card.adultTokens, adult.progress
    + (cycleMonth % card.regularTokenMonths === 0 ? 1 : 0));
  if (progress < card.adultTokens) return { ...adult, cycleMonth, progress };
  return {
    ...adult, stage: "ready", cycleMonth, progress, readyAge: 0,
    yieldResult: succeeds(fruitHighChance(adult), random) ? "high" : "low",
  };
}

export const fruitYield = (adult: FruitAdult) => adult.stage !== "ready" ? 0
  : (adult.readyAge === 0 ? card.readyYield : card.overripeYield)[adult.yieldResult];

export const canCollectFruit = (adult: FruitAdult) => adult.stage === "ready"
  && adult.production.harvesting && adult.production.hauling;

export function collectFruitCycle(quantity: number): FruitAdult {
  return {
    phase: "adult", stage: "resting", progress: 0, payments: [],
    production: { harvesting: false, hauling: false },
    lastHarvest: { outcome: "collected", quantity },
  };
}

export function tickFruit(crop: FruitCrop, random: RandomSource): FruitCrop {
  const life = crop.lifecycle;
  if (life.phase === "preparation") return crop;
  return { ...crop, lifecycle: life.phase === "young"
    ? tickFruitYoung(life, random) : tickFruitAdult(life, random) };
}

export function prepareFruitProduction(crop: FruitCrop, task: unknown): FruitPayment | null {
  const life = crop.lifecycle;
  if (life.phase !== "adult" || life.stage !== "ready" || !owns(card.productionCosts, task)
    || life.production[task]) return null;
  return { cost: card.productionCosts[task], crop: { ...crop, lifecycle: {
    ...life, production: { ...life.production, [task]: true },
  } } };
}
