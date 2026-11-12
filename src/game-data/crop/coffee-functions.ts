import type { CoffeeAdult, CoffeeCrop, CoffeeYoung, CropCalendar, CropProductionPayment } from "./crop-types";
import type { Currency } from "../types";
import type { Yield } from "../yield/yield-types";
import { COFFEE_CARD as card } from "./long-term-crop-data";
import { advanceYoungTrack, maintenanceChance, prepareLongTermPreparation, prepareYoungMaintenance, succeeds, type RandomSource } from "./long-term-crop-functions";

export const coffeeMonthIndex = ({ year, month }: CropCalendar) =>
  (year - 1) * 12 + month - 1;
export const coffeeCycleMonth = (month: number) => (month % 12) + 1;
export const coffeeCycleHarvestYear = ({ year, month }: CropCalendar) =>
  year + (month === 12 ? 1 : 0);
export const coffeeProgress = (month: number) =>
  month === 12 ? 0 : Math.floor((month + 1) / 3);

export function newCoffeeAdult(at: CropCalendar): CoffeeAdult {
  return {
    phase: "adult", calendar: { ...at }, progress: coffeeProgress(at.month),
    firstEligibleHarvestYear: at.year + (at.month <= 4 ? 0 : 1),
    cycleHarvestYear: coffeeCycleHarvestYear(at),
    payments: [], opportunity: null, batch: null,
  };
}

export function matureCoffeeIfReady(
  young: CoffeeYoung, at: CropCalendar,
): CoffeeYoung | CoffeeAdult {
  return young.regularTokens + young.bonusTokens < card.developmentTokens
    ? young : newCoffeeAdult(at);
}

type CoffeePayment = { crop: CoffeeCrop; cost: Currency };

export function prepareCoffeePreparation(
  crop: CoffeeCrop, task: unknown,
): CoffeePayment | null {
  const life = crop.lifecycle;
  if (life.phase !== "development") return null;
  const payment = prepareLongTermPreparation(life, card.developmentCosts, task);
  return payment
    ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } }
    : null;
}

export function tickCoffee(
  crop: CoffeeCrop, at: CropCalendar, random: RandomSource,
): CoffeeCrop {
  const life = crop.lifecycle;
  if (life.phase === "development") return crop;
  return { ...crop, lifecycle: life.phase === "young"
    ? matureCoffeeIfReady(
        advanceYoungTrack(life, card.developmentMaintenanceSlots, random), at,
      )
    : tickCoffeeAdult(life, at, random) };
}

export const coffeeHighChance = (adult: CoffeeAdult) =>
  maintenanceChance(adult.payments, card.productionMaintenanceSlots);

export function coffeeAdultWeight(month: number): 100 | 75 | 50 | 25 {
  const cycleMonth = coffeeCycleMonth(month);
  return cycleMonth <= 3 ? 100 : cycleMonth <= 6 ? 75
    : cycleMonth <= 9 ? 50 : 25;
}

export function coffeeCareBlockReason(adult: CoffeeAdult): string | null {
  if (adult.cycleHarvestYear < adult.firstEligibleHarvestYear) {
    return `F&M cannot affect this cycle. First eligible harvest: November, year ${adult.firstEligibleHarvestYear}.`;
  }
  if (adult.calendar.month === 11) return "F&M closes when November begins.";
  if (adult.payments.length >= card.productionMaintenanceSlots)
    return "All F&M slots for this cycle are funded.";
  return null;
}

function prepareCoffeeCare(
  crop: CoffeeCrop, mode: "one" | "all",
): CoffeePayment | null {
  const life = crop.lifecycle;
  if (life.phase === "development") return null;
  if (life.phase === "young") {
    const payment = prepareYoungMaintenance(
      life, card.developmentMaintenanceSlots, mode,
    );
    return payment
      ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } }
      : null;
  }
  if (coffeeCareBlockReason(life)) return null;
  const remaining = card.productionMaintenanceSlots - life.payments.length;
  const count = mode === "all" ? remaining : 1;
  const weightHundredths = coffeeAdultWeight(life.calendar.month);
  return {
    cost: { gold: card.maintenanceCost.gold * count, silver: 0 },
    crop: { ...crop, lifecycle: { ...life, payments: [
      ...life.payments,
      ...Array.from({ length: count }, () => ({
        month: coffeeCycleMonth(life.calendar.month), weightHundredths,
      })),
    ] } },
  };
}

export const prepareCoffeeMaintenance = (crop: CoffeeCrop) =>
  prepareCoffeeCare(crop, "one");
export const prepareCoffeeFullMaintenance = (crop: CoffeeCrop) =>
  prepareCoffeeCare(crop, "all");

export function tickCoffeeAdult(
  adult: CoffeeAdult, at: CropCalendar, random: RandomSource,
): CoffeeAdult {
  const now = coffeeMonthIndex(at);
  if (now <= coffeeMonthIndex(adult.calendar)) return adult;
  const cycleHarvestYear = coffeeCycleHarvestYear(at);
  let next: CoffeeAdult = {
    ...adult, calendar: { ...at }, progress: coffeeProgress(at.month),
    cycleHarvestYear,
    payments: cycleHarvestYear === adult.cycleHarvestYear ? adult.payments : [],
    opportunity: adult.opportunity && now < adult.opportunity.expiresAt
      ? adult.opportunity : null,
    batch: adult.batch && now < adult.batch.expiresAt ? adult.batch : null,
  };
  if (at.month === 11 && at.year >= next.firstEligibleHarvestYear) {
    next = { ...next, opportunity: {
      harvestYear: at.year,
      yieldResult: succeeds(coffeeHighChance(next), random) ? "high" : "low",
      expiresAt: coffeeMonthIndex({ year: at.year + 1, month: 3 }),
    } };
  }
  return next;
}

export function coffeeAvailableYield(adult: CoffeeAdult): Yield | null {
  const opportunity = adult.opportunity;
  const now = coffeeMonthIndex(adult.calendar);
  if (!opportunity || adult.batch
    || now < coffeeMonthIndex({ year: opportunity.harvestYear, month: 11 })
    || now >= opportunity.expiresAt) return null;
  const month = adult.calendar.month;
  if (month !== 11 && month !== 12 && month !== 1 && month !== 2) return null;
  return card.harvestYield[month][opportunity.yieldResult];
}

export function prepareCoffeeProduction(
  crop: CoffeeCrop, task: unknown,
): CropProductionPayment<CoffeeCrop> | null {
  const life = crop.lifecycle;
  if (life.phase !== "adult") return null;
  const now = coffeeMonthIndex(life.calendar);
  if (task === "harvesting") {
    const quantity = coffeeAvailableYield(life);
    if (!quantity) return null;
    return {
      cost: card.productionCosts.harvesting,
      crop: { ...crop, lifecycle: { ...life, opportunity: null, batch: {
        stage: "harvested", quantity, harvestedAt: now, expiresAt: now + 1,
      } } },
    };
  }
  const batch = life.batch;
  if (!batch || now >= batch.expiresAt) return null;
  if (task === "dryingMilling") {
    if (batch.stage !== "harvested" || now !== batch.harvestedAt) return null;
    return {
      cost: card.productionCosts.dryingMilling,
      crop: { ...crop, lifecycle: { ...life, batch: {
        ...batch, stage: "driedMilled", expiresAt: batch.harvestedAt + 2,
      } } },
    };
  }
  if (task !== "hauling" || batch.stage !== "driedMilled") return null;
  return {
    cost: card.productionCosts.hauling,
    crop: { ...crop, lifecycle: { ...life, batch: null } },
    collectedProduce: { kind: "coffee", quantity: batch.quantity },
  };
}
