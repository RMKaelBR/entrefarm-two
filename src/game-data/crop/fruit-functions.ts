import type { Yield } from "../yield/yield-types";
import { makeYield } from "../yield/calculate-yield";
import { advanceYoungTrack, prepareLongTermPreparation, prepareYoungMaintenance, succeeds, youngBonusChance, youngPaymentWeight, youngPeriodMonth, type RandomSource, maintenanceChance, productionProgressAfterAdvance } from "./long-term-crop-functions";
import { FRUIT_CARD as card } from "./long-term-crop-data";
import type { FruitAdult, FruitCrop, FruitYoung } from "./crop-types";
import type { Currency } from "../types";

type FruitPayment = { crop: FruitCrop; cost: Currency };

export const fruitPeriodMonth = youngPeriodMonth;
export const fruitYoungPoints = youngPaymentWeight;
export const fruitBonusChance = (young: FruitYoung) =>
  youngBonusChance(young, card.developmentMaintenanceSlots);

export function fruitAdultWeight(month: number): 100 | 75 | 50 | 25 {
  return month <= 3 ? 100 : month <= 6 ? 75 : month <= 9 ? 50 : 25;
}
export const fruitHighChance = (adult: FruitAdult) =>
  maintenanceChance(adult.payments, card.productionMaintenanceSlots);

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

export function prepareFruitPreparation(
  crop: FruitCrop, task: unknown,
): FruitPayment | null {
  const life = crop.lifecycle;
  if (life.phase !== "development") return null;
  const payment = prepareLongTermPreparation(life, card.developmentCosts, task);
  return payment ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } } : null;
}

export function prepareFruitMaintenance(crop: FruitCrop): FruitPayment | null {
  const life = crop.lifecycle;
  if (life.phase === "development") return null;
  if (life.phase === "young") {
    const payment = prepareYoungMaintenance(life, card.developmentMaintenanceSlots);
    return payment ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } } : null;
  }
  if (life.stage !== "growing" || life.cycleMonth > 11
    || life.payments.length >= card.productionMaintenanceSlots) return null;
  return { cost: card.maintenanceCost, crop: { ...crop, lifecycle: {
    ...life, payments: [...life.payments, {
      month: life.cycleMonth, weightHundredths: fruitAdultWeight(life.cycleMonth),
    }],
  } } };
}
export function prepareFruitFullMaintenance(crop: FruitCrop): FruitPayment | null {
  if (crop.lifecycle.phase === "young") {
    const payment = prepareYoungMaintenance(crop.lifecycle, card.developmentMaintenanceSlots, "all");
    return payment ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } } : null;
  }
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
  return total < card.developmentTokens
    ? young
    : newFruitAdultCycle(total - card.developmentTokens);
}

export function tickFruitYoung(
  young: FruitYoung, random: RandomSource,
): FruitYoung | FruitAdult {
  return matureFruitIfReady(
    advanceYoungTrack(young, card.developmentMaintenanceSlots, random),
  );
}

export function tickFruitAdult(adult: FruitAdult, random: RandomSource): FruitAdult {
  if (adult.stage === "resting") return newFruitAdultCycle(0, adult.lastHarvest);
  if (adult.stage === "ready") {
    return adult.readyAge === 0
      ? { ...adult, readyAge: 1 }
      : newFruitAdultCycle(0, { outcome: "lost", quantity: makeYield(0) });
  }
  const cycleMonth = adult.cycleMonth + 1;
  const progress = productionProgressAfterAdvance(
    adult.progress, cycleMonth, card.productionTokens, card.monthsPerGrowthToken,
  );
  if (progress < card.productionTokens) return { ...adult, cycleMonth, progress };
  return {
    ...adult, stage: "ready", cycleMonth, progress, readyAge: 0,
    yieldResult: succeeds(fruitHighChance(adult), random) ? "high" : "low",
  };
}

export const fruitYield = (adult: FruitAdult): Yield => adult.stage !== "ready" ? makeYield(0)
  : (adult.readyAge === 0 ? card.readyYield : card.overripeYield)[adult.yieldResult];

export const canCollectFruit = (adult: FruitAdult) => adult.stage === "ready"
  && adult.production.harvesting && adult.production.hauling;

export function collectFruitCycle(quantity: Yield): FruitAdult {
  return {
    phase: "adult", stage: "resting", progress: 0, payments: [],
    production: { harvesting: false, hauling: false },
    lastHarvest: { outcome: "collected", quantity },
  };
}

export function tickFruit(crop: FruitCrop, random: RandomSource): FruitCrop {
  const life = crop.lifecycle;
  if (life.phase === "development") return crop;
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
