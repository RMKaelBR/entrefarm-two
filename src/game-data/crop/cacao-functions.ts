import type { CacaoAdult, CacaoCrop, CacaoYoung, CropProductionPayment } from "./crop-types";
import type { Currency } from "../types";
import type { Yield } from "../yield/yield-types";
import { gold } from "../money/calculate-money";
import { CACAO_CARD as card } from "./long-term-crop-data";
import { advanceYoungTrack, maintenanceChance, prepareLongTermPreparation, prepareYoungMaintenance, productionProgressAfterAdvance, succeeds, type RandomSource } from "./long-term-crop-functions";
type CacaoPayment = { crop: CacaoCrop; cost: Currency };

export function prepareCacaoPreparation(
  crop: CacaoCrop, task: unknown,
): CacaoPayment | null {
  if (crop.lifecycle.phase !== "development") return null;
  const payment = prepareLongTermPreparation(
    crop.lifecycle, card.developmentCosts, task,
  );
  return payment
    ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } }
    : null;
}

export function newCacaoAdult(progress = 0): CacaoAdult {
  return {
    phase: "adult", stage: "growing", adultMonth: 1, cycleMonth: 1,
    progress,
    nextReadyAt: (card.productionTokens - progress) * card.monthsPerGrowthToken,
    payments: [], opportunity: null, batch: null,
  };
}

export function matureCacaoIfReady(
  young: CacaoYoung,
): CacaoYoung | CacaoAdult {
  const total = young.regularTokens + young.bonusTokens;
  return total < card.developmentTokens
    ? young : newCacaoAdult(total - card.developmentTokens);
}

export function tickCacao(crop: CacaoCrop, random: RandomSource): CacaoCrop {
  const life = crop.lifecycle;
  if (life.phase === "development") return crop;
  return { ...crop, lifecycle: life.phase === "young"
    ? matureCacaoIfReady(advanceYoungTrack(
        life, card.developmentMaintenanceSlots, random,
      ))
    : tickCacaoAdult(life, random) };
}

export const cacaoAdultWeight = (month: number): 100 | 75 =>
  month <= 3 ? 100 : 75;
export const cacaoHighChance = (adult: CacaoAdult) =>
  maintenanceChance(adult.payments, card.productionMaintenanceSlots);

function prepareCacaoCare(
  crop: CacaoCrop, mode: "one" | "all",
): CacaoPayment | null {
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
  const remaining = card.productionMaintenanceSlots - life.payments.length;
  if (life.stage !== "growing" || remaining <= 0) return null;
  const count = mode === "all" ? remaining : 1;
  const weightHundredths = cacaoAdultWeight(life.cycleMonth);
  return {
    cost: gold(card.maintenanceCost.gold * count),
    crop: { ...crop, lifecycle: { ...life, payments: [
      ...life.payments,
      ...Array.from({ length: count }, () => ({
        month: life.cycleMonth, weightHundredths,
      })),
    ] } },
  };
}
export const prepareCacaoMaintenance = (crop: CacaoCrop) =>
  prepareCacaoCare(crop, "one");
export const prepareCacaoFullMaintenance = (crop: CacaoCrop) =>
  prepareCacaoCare(crop, "all");

export function tickCacaoAdult(
  adult: CacaoAdult, random: RandomSource,
): CacaoAdult {
  const adultMonth = adult.adultMonth + 1;
  const restarting = adult.stage === "ready";
  const cycleMonth = restarting ? 1 : adult.cycleMonth + 1;
  const payments = restarting ? [] : adult.payments;
  const progress = productionProgressAfterAdvance(
    restarting ? 0 : adult.progress, cycleMonth,
    card.productionTokens, card.monthsPerGrowthToken,
  );
  const next: CacaoAdult = {
    ...adult, stage: "growing", adultMonth, cycleMonth, progress, payments,
    opportunity: adult.opportunity && adultMonth < adult.opportunity.expiresAt
      ? adult.opportunity : null,
    batch: adult.batch && adultMonth < adult.batch.expiresAt
      ? adult.batch : null,
  };
  if (progress < card.productionTokens) return next;
  return {
    ...next, stage: "ready",
    nextReadyAt: adultMonth + card.productionCycleMonths,
    opportunity: {
      readyAt: adultMonth, expiresAt: adultMonth + 2,
      yieldResult: succeeds(
        maintenanceChance(payments, card.productionMaintenanceSlots), random,
      ) ? "high" : "low",
    },
  };
}

export function cacaoAvailableYield(adult: CacaoAdult): Yield | null {
  const opportunity = adult.opportunity;
  if (!opportunity || adult.batch
    || adult.adultMonth < opportunity.readyAt
    || adult.adultMonth >= opportunity.expiresAt) return null;
  return adult.adultMonth === opportunity.readyAt
    ? card.readyYield[opportunity.yieldResult] : card.lateYield;
}

export function prepareCacaoProduction(
  crop: CacaoCrop, task: unknown,
): CropProductionPayment<CacaoCrop> | null {
  const life = crop.lifecycle;
  if (life.phase !== "adult") return null;
  const now = life.adultMonth;
  if (task === "harvesting") {
    const quantity = cacaoAvailableYield(life);
    if (!quantity) return null;
    return {
      cost: card.productionCosts.harvesting,
      crop: { ...crop, lifecycle: { ...life, opportunity: null, batch: {
        stage: "harvested", quantity: { ...quantity },
        harvestedAt: now, expiresAt: now + 1,
      } } },
    };
  }
  const batch = life.batch;
  if (!batch || now !== batch.harvestedAt || now >= batch.expiresAt) return null;
  if (task === "splittingFermentingDrying") {
    if (batch.stage !== "harvested") return null;
    return {
      cost: card.productionCosts.splittingFermentingDrying,
      crop: { ...crop, lifecycle: {
        ...life, batch: { ...batch, stage: "processed" },
      } },
    };
  }
  if (task !== "hauling" || batch.stage !== "processed") return null;
  return {
    cost: card.productionCosts.hauling,
    crop: { ...crop, lifecycle: { ...life, batch: null } },
    collectedProduce: { kind: "cacao", quantity: { ...batch.quantity } },
  };
}
