import type { BananaAdult, BananaCrop, BananaYoung, CropProductionPayment } from "./crop-types";
import type { Currency } from "../types";
import type { Yield } from "../yield/yield-types";
import { makeYield } from "../yield/calculate-yield";
import { BANANA_CARD as card } from "./long-term-crop-data";
import { advanceYoungTrack, maintenanceChance, prepareLongTermPreparation, prepareYoungMaintenance, succeeds, type RandomSource } from "./long-term-crop-functions";

type Payment = { crop: BananaCrop; cost: Currency };
const owns = (key: unknown): key is "harvesting" | "hauling" => key === "harvesting" || key === "hauling";

export const bananaAdultWeight = (month: number): 100 | 75 => month === 1 ? 100 : 75;
export const bananaHighChance = (adult: BananaAdult) => maintenanceChance(adult.payments, card.productionMaintenanceSlots);
export const bananaYield = (adult: BananaAdult): Yield => adult.stage === "ready" ? card.readyYield[adult.yieldResult] : makeYield(0);

export function newBananaAdultCycle(): BananaAdult {
  return { phase: "adult", stage: "growing", cycleMonth: 1, progress: 0, payments: [],
    production: { harvesting: false, hauling: false }, batch: null };
}

export function prepareBananaPreparation(crop: BananaCrop, task: unknown): Payment | null {
  const life = crop.lifecycle;
  if (life.phase !== "development") return null;
  const payment = prepareLongTermPreparation(life, card.developmentCosts, task);
  return payment ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } } : null;
}

export function prepareBananaMaintenance(crop: BananaCrop): Payment | null {
  return prepareBananaCare(crop, false);
}
export function prepareBananaFullMaintenance(crop: BananaCrop): Payment | null {
  return prepareBananaCare(crop, true);
}
function prepareBananaCare(crop: BananaCrop, all: boolean): Payment | null {
  const life = crop.lifecycle;
  if (life.phase === "development") return null;
  if (life.phase === "young") {
    const payment = prepareYoungMaintenance(life, card.developmentMaintenanceSlots, all ? "all" : "one");
    return payment ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } } : null;
  }
  const remaining = card.productionMaintenanceSlots - life.payments.length;
  if (life.stage !== "growing" || life.cycleMonth > 2 || remaining <= 0) return null;
  const count = all ? remaining : 1;
  const weightHundredths = bananaAdultWeight(life.cycleMonth);
  return { cost: { gold: count, silver: 0 }, crop: { ...crop, lifecycle: {
    ...life, payments: [...life.payments, ...Array.from({ length: count }, () => ({ month: life.cycleMonth, weightHundredths }))],
  } } };
}

export function matureBananaIfReady(young: BananaYoung): BananaYoung | BananaAdult {
  const total = young.regularTokens + young.bonusTokens;
  if (total < card.developmentTokens) return young;
  const adult = newBananaAdultCycle();
  return total === card.developmentTokens ? adult : {
    ...adult, stage: "ready", cycleMonth: 3, progress: card.productionTokens,
    yieldResult: "low", fromOverflow: true,
  };
}

export function tickBananaAdult(adult: BananaAdult, random: RandomSource): BananaAdult {
  if (adult.stage === "ready") return newBananaAdultCycle();
  const cycleMonth = (adult.cycleMonth + 1) as 2 | 3;
  if (cycleMonth === 2) return { ...adult, cycleMonth };
  const high = succeeds(bananaHighChance(adult), random);
  return { ...adult, stage: "ready", cycleMonth: 3, progress: card.productionTokens,
    yieldResult: high ? "high" : "low", fromOverflow: false };
}

export function tickBanana(crop: BananaCrop, random: RandomSource): BananaCrop {
  const life = crop.lifecycle;
  if (life.phase === "development") return crop;
  if (life.phase === "young") return { ...crop, lifecycle: matureBananaIfReady(advanceYoungTrack(life, card.developmentMaintenanceSlots, random)) };
  return { ...crop, lifecycle: tickBananaAdult(life, random) };
}

export function prepareBananaProduction(crop: BananaCrop, task: unknown): CropProductionPayment<BananaCrop> | null {
  const life = crop.lifecycle;
  if (life.phase !== "adult" || life.stage !== "ready" || !owns(task) || life.production[task]) return null;
  if (task === "harvesting") {
    const quantity = bananaYield(life);
    return { cost: card.productionCosts.harvesting, crop: { ...crop, lifecycle: {
      ...life, production: { ...life.production, harvesting: true }, batch: { quantity: { ...quantity } },
    } } };
  }
  if (!life.production.harvesting || !life.batch) return null;
  return { cost: card.productionCosts.hauling, crop: { ...crop, lifecycle: {
    ...life, production: { ...life.production, hauling: true }, batch: null,
  } }, collectedProduce: { kind: "banana", quantity: { ...life.batch.quantity } } };
}
