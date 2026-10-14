import { COCONUT_CARD as card } from "./coconut-data";
import type { CoconutAdult, CoconutCrop, CoconutYoung } from "./crop-types";
import type { Currency } from "../types";

export type RandomSource = () => number;
type Payment = { crop: CoconutCrop; cost: Currency };
const owns = <T extends object>(object: T, key: unknown): key is Extract<keyof T, string> =>
  typeof key === "string" && Object.prototype.hasOwnProperty.call(object, key);
export const periodMonth = (month: number) => ((month - 1) % card.periodMonths) + 1;
export const paymentPoints = (month: number): 100 | 90 | 75 => {
  const relative = periodMonth(month);
  return relative <= 2 ? 100 : relative <= 4 ? 90 : 75;
};
export const pointTotal = (young: CoconutYoung) =>
  young.payments.reduce((sum, payment) => sum + payment.pointHundredths, 0);
export const bonusChance = (young: CoconutYoung) => pointTotal(young) / (card.maintenanceSlots * 100);
export const youngProgress = (young: CoconutYoung) => Math.min(card.youngTokens, young.regularTokens + young.bonusTokens);
export const adultProgress = (adult: CoconutAdult) => adult.stage === "ready" ? card.adultTokens : 0;
export const adultHighChance = (adult: CoconutAdult) => adult.fmPaidMonth === 1 ? 1 : adult.fmPaidMonth === 2 ? card.monthTwoChance : 0;
export const succeeds = (chance: number, random: RandomSource) => chance >= 1 || (chance > 0 && random() < chance);

export function newAdultCycle(): CoconutAdult {
  return { phase: "adult", stage: "growing", cycleMonth: 1, fmPaidMonth: null,
    production: { climbingPiling: false, husking: false, hauling: false }, lastHarvest: null };
}
export function matureIfReady(young: CoconutYoung): CoconutYoung | CoconutAdult {
  const total = young.regularTokens + young.bonusTokens;
  if (total < card.youngTokens) return young;
  const adult = newAdultCycle();
  return total === card.youngTokens ? adult : { ...adult, stage: "ready", cycleMonth: card.readyMonth,
    yieldResult: "low", readyAge: 0, fromOverflow: true };
}
export function tickYoung(young: CoconutYoung, random: RandomSource): CoconutYoung | CoconutAdult {
  let next = { ...young, cropMonth: young.cropMonth + 1 };
  if (young.cropMonth % card.periodMonths === 0) {
    next = { ...next, bonusTokens: next.bonusTokens + (succeeds(bonusChance(young), random) ? 1 : 0), payments: [] };
  }
  if (next.cropMonth % card.regularTokenMonths === 0) next = { ...next, regularTokens: next.regularTokens + 1 };
  return matureIfReady(next);
}
export function finishAdultCycle(outcome: "collected" | "lost", quantity: number): CoconutAdult {
  return {
    phase: "adult", stage: "resting", fmPaidMonth: null,
    production: { climbingPiling: false, husking: false, hauling: false },
    lastHarvest: { outcome, quantity },
  };
}
export function tickAdult(adult: CoconutAdult, random: RandomSource): CoconutAdult {
  // Harvest completion owns its world month; the next advance starts month 1.
  if (adult.stage === "resting") return {
    ...newAdultCycle(),
    lastHarvest: adult.lastHarvest,
  };
  if (adult.stage === "ready") {
    if (adult.readyAge === 2) return finishAdultCycle("lost", 0);
    return { ...adult, readyAge: adult.readyAge === 0 ? 1 : 2 };
  }
  if (adult.cycleMonth === 1) return { ...adult, cycleMonth: 2 };
  return { ...adult, stage: "ready", cycleMonth: card.readyMonth,
    yieldResult: succeeds(adultHighChance(adult), random) ? "high" : "low", readyAge: 0, fromOverflow: false };
}
export function tickCoconut(crop: CoconutCrop, random: RandomSource): CoconutCrop {
  const life = crop.lifecycle;
  if (life.phase === "preparation") return crop;
  return { ...crop, lifecycle: life.phase === "young" ? tickYoung(life, random) : tickAdult(life, random) };
}
export const coconutYield = (adult: CoconutAdult) => adult.stage !== "ready" ? 0
  : (adult.readyAge === 0 ? card.readyYield : card.fallenYield)[adult.yieldResult];
export const canCollectCoconut = (adult: CoconutAdult) => adult.stage === "ready"
  && (adult.readyAge > 0 || adult.production.climbingPiling) && adult.production.husking && adult.production.hauling;

export function prepareCoconutDevelopment(crop: CoconutCrop, task: unknown): Payment | null {
  const life = crop.lifecycle;
  if (life.phase !== "preparation" || !owns(card.developmentCosts, task) || life.development[task]) return null;
  const development = { ...life.development, [task]: true };
  return { cost: card.developmentCosts[task], crop: { ...crop, lifecycle: Object.values(development).every(Boolean)
    ? { phase: "young", cropMonth: 1, regularTokens: 0, bonusTokens: 0, payments: [] }
    : { ...life, development } } };
}
export function prepareCoconutMaintenance(crop: CoconutCrop): Payment | null {
  const life = crop.lifecycle;
  if (life.phase === "preparation") return null;
  if (life.phase === "young") {
    if (life.payments.length >= card.maintenanceSlots) return null;
    return { cost: card.maintenanceCost, crop: { ...crop, lifecycle: { ...life, payments: [...life.payments,
      { cropMonth: life.cropMonth, pointHundredths: paymentPoints(life.cropMonth) }] } } };
  }
  if (life.stage !== "growing" || life.fmPaidMonth !== null) return null;
  return { cost: card.maintenanceCost, crop: { ...crop, lifecycle: { ...life, fmPaidMonth: life.cycleMonth } } };
}
export function prepareCoconutFullMaintenance(crop: CoconutCrop): Payment | null {
  const life = crop.lifecycle;
  if (life.phase !== "young") return null;
  const remaining = card.maintenanceSlots - life.payments.length;
  if (remaining <= 0) return null;
  return {
    cost: { gold: card.maintenanceCost.gold * remaining, silver: card.maintenanceCost.silver * remaining },
    crop: { ...crop, lifecycle: { ...life, payments: [...life.payments,
      ...Array.from({ length: remaining }, () => ({ cropMonth: life.cropMonth, pointHundredths: paymentPoints(life.cropMonth) }))] } },
  };
}

export function prepareCoconutProduction(crop: CoconutCrop, task: unknown): Payment | null {
  const life = crop.lifecycle;
  if (life.phase !== "adult" || life.stage !== "ready" || !owns(card.productionCosts, task)
    || life.production[task] || (task === "climbingPiling" && life.readyAge > 0)
    || (task === "hauling" && !life.production.husking)) return null;
  return { cost: card.productionCosts[task], crop: { ...crop, lifecycle: { ...life, production: { ...life.production, [task]: true } } } };
}
