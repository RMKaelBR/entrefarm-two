import type { CropProductionPayment, RubberAdult, RubberBatch, RubberCrop, RubberYoung } from "./crop-types";
import type { Currency } from "../types";
import { RUBBER_CARD as card } from "./long-term-crop-data";
import { advanceYoungTrack, maintenanceChance, prepareLongTermPreparation, prepareYoungMaintenance, productionProgressAfterAdvance, succeeds, type RandomSource } from "./long-term-crop-functions";

export const rubberHighChance = (adult: RubberAdult) =>
  maintenanceChance(adult.payments, card.productionMaintenanceSlots);

export function prepareRubberPreparation(crop: RubberCrop, task: unknown): RubberPayment | null {
  const life = crop.lifecycle;
  if (life.phase !== "development") return null;
  const payment = prepareLongTermPreparation(life, card.developmentCosts, task);
  return payment ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } } : null;
}

export function prepareRubberFullMaintenance(crop: RubberCrop): RubberPayment | null {
  if (crop.lifecycle.phase !== "young") return prepareRubberMaintenance(crop);
  const payment = prepareYoungMaintenance(crop.lifecycle, card.developmentMaintenanceSlots, "all");
  return payment ? { cost: payment.cost, crop: { ...crop, lifecycle: payment.state } } : null;
}

type RubberPayment = { crop: RubberCrop; cost: Currency };

export function newRubberAdultCycle(previousCyclePenalty = false): RubberAdult {
  return {
    phase: "adult", stage: "growing", cycleMonth: 1,
    progress: 0, payments: [], tappedOnTime: false, fromOverflow: false,
    previousCyclePenalty, lateTappingAvailable: false, batch: null,
  };
}

export function matureRubberIfReady(
  young: RubberYoung,
): RubberYoung | RubberAdult {
  const total = young.regularTokens + young.bonusTokens;
  if (total < card.developmentTokens) return young;
  const adult = newRubberAdultCycle();
  return total === card.developmentTokens ? adult : {
    ...adult, stage: "ready", cycleMonth: 3,
    progress: card.productionTokens, yieldResult: "low", fromOverflow: true,
  };
}

export function tickRubber(crop: RubberCrop, random: RandomSource): RubberCrop {
  const life = crop.lifecycle;
  if (life.phase === "development") return crop;
  return { ...crop, lifecycle: life.phase === "young"
    ? matureRubberIfReady(advanceYoungTrack(
        life, card.developmentMaintenanceSlots, random,
      ))
    : tickRubberAdult(life, random) };
}

export function prepareRubberMaintenance(crop: RubberCrop): RubberPayment | null {
  const life = crop.lifecycle;
  if (life.phase === "development") return null;
  if (life.phase === "young") {
    const payment = prepareYoungMaintenance(life, card.developmentMaintenanceSlots);
    return payment ? { cost: payment.cost,
      crop: { ...crop, lifecycle: payment.state } } : null;
  }
  if (life.stage !== "growing" || life.payments.length >= card.productionMaintenanceSlots)
    return null;
  return { cost: card.maintenanceCost, crop: { ...crop, lifecycle: {
    ...life, payments: [{ month: life.cycleMonth,
      weightHundredths: life.cycleMonth === 1 ? 100 : 75 }],
  } } };
}

function ageRubberBatch(batch: RubberBatch | null): RubberBatch | null {
  if (!batch || batch.advancesSinceTapping === 1) return null;
  return {
    ...batch, quantity: Math.max(0, batch.quantity - 1),
    advancesSinceTapping: 1,
  };
}

export function tickRubberAdult(adult: RubberAdult, random: RandomSource): RubberAdult {
  const batch = ageRubberBatch(adult.batch);
  if (adult.stage === "ready") {
    return {
      ...newRubberAdultCycle(!adult.tappedOnTime),
      batch,
      lateTappingAvailable: !adult.tappedOnTime,
    };
  }
  if (adult.cycleMonth === 1) {
    return { ...adult, cycleMonth: 2, batch, lateTappingAvailable: false };
  }
  return {
    ...adult, stage: "ready", cycleMonth: 3,
    progress: productionProgressAfterAdvance(
      adult.progress, 3, card.productionTokens, card.monthsPerGrowthToken,
    ),
    batch, lateTappingAvailable: false,
    yieldResult: succeeds(rubberHighChance(adult), random) ? "high" : "low",
  };
}

export function prepareRubberTapping(crop: RubberCrop): RubberPayment | null {
  const life = crop.lifecycle;
  if (life.phase !== "adult") return null;
  const onTime = life.stage === "ready"
    && !life.tappedOnTime;
  const late = life.stage === "growing" && life.cycleMonth === 1
    && life.lateTappingAvailable;
  if (!onTime && !late) return null;
  if (life.stage === "ready" && onTime) {
    const quantity = card.readyYield[life.yieldResult]
      - (life.previousCyclePenalty ? 1 : 0);
    return { cost: card.productionCosts.tapping, crop: { ...crop, lifecycle: {
      ...life, tappedOnTime: true, batch: {
        quantity, advancesSinceTapping: 0,
      },
    } } };
  }
  return { cost: card.productionCosts.tapping, crop: { ...crop, lifecycle: {
    ...life, lateTappingAvailable: false, batch: {
      quantity: card.lateYield, advancesSinceTapping: 0,
    },
  } } };
}

export function prepareRubberHauling(
  crop: RubberCrop,
): (RubberPayment & { quantity: number }) | null {
  const life = crop.lifecycle;
  if (life.phase !== "adult") return null;
  const batch = life.batch;
  if (!batch || batch.quantity <= 0) return null;
  return { cost: card.productionCosts.hauling, quantity: batch.quantity,
    crop: { ...crop, lifecycle: { ...life,
      batch: null,
    } } };
}

export function prepareRubberProduction(
  crop: RubberCrop,
  task: unknown,
): CropProductionPayment<RubberCrop> | null {
  if (task === "tapping") return prepareRubberTapping(crop);
  if (task !== "hauling") return null;

  const payment = prepareRubberHauling(crop);
  if (!payment) return null;
  return {
    cost: payment.cost,
    crop: payment.crop,
    collectedProduce: { kind: "rubber", quantity: payment.quantity },
  };
}
