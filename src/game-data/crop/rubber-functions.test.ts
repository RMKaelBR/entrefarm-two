import { describe, expect, it, vi } from "vitest";
import { createCrop, prepareCropDevelopment, prepareCropMaintenance, prepareCropProduction, tickCrops } from "./crop-functions";
import type { RubberAdult, RubberCrop, RubberYoung } from "./crop-types";
import { newLongTermYoung } from "./long-term-crop-functions";
import { matureRubberIfReady, newRubberAdultCycle, prepareRubberProduction, prepareRubberFullMaintenance, prepareRubberHauling, prepareRubberMaintenance, prepareRubberPreparation, prepareRubberTapping, tickRubber } from "./rubber-functions";

const tree = (lifecycle: RubberCrop["lifecycle"] = newRubberAdultCycle()): RubberCrop => ({
  ...createCrop("rubber", "parcel", 1, 1), lifecycle,
});
const ready = (yieldResult: "high" | "low" = "high", previousCyclePenalty = false): RubberAdult => ({
  ...newRubberAdultCycle(previousCyclePenalty), stage: "ready", cycleMonth: 3,
  progress: 1, yieldResult, fromOverflow: false,
});
function required<T>(value: T | null): T {
  if (value === null) throw new Error("Expected eligible payment");
  return value;
}
const tick = (crop: RubberCrop) => tickRubber(crop, () => 0.99);

describe("rubber preparation and development", () => {
  it("dispatches preparation and starts the clock only after all tasks", () => {
    let crop = createCrop("rubber", "parcel", 1, 1);
    const identity = { id: crop.id, landId: crop.landId, startedYear: 1, startedMonth: 1 };
    let spent = 2;
    expect(prepareRubberFullMaintenance(crop)).toBeNull();
    expect(prepareRubberPreparation(crop, "plowing")).toBeNull();
    for (const task of ["siteClearing", "seedlingHauling", "planting"] as const) {
      expect(tickCrops([crop])[0]).toBe(crop);
      const payment = required(prepareCropDevelopment(crop, task, undefined));
      spent += payment.cost.gold;
      if (payment.crop.kind !== "rubber") throw new Error("Expected rubber");
      crop = payment.crop;
      expect(prepareRubberPreparation(crop, task)).toBeNull();
    }
    expect(spent).toBe(5);
    expect(crop).toMatchObject(identity);
    expect(crop.lifecycle).toEqual(newLongTermYoung());
    expect(tickCrops([crop])[0]).toMatchObject({ lifecycle: { cropMonth: 2, regularTokens: 0 } });
    expect(prepareCropMaintenance(crop)).not.toBeNull();
    expect(prepareCropProduction(crop, "tapping")).toBeNull();
  });

  it("grants regular tokens on arrival at every third young month", () => {
    let crop = tree(newLongTermYoung());
    for (let month = 2; month <= 9; month++) {
      crop = tick(crop);
      expect(crop.lifecycle).toMatchObject({ cropMonth: month, regularTokens: Math.floor(month / 3) });
    }
  });

  it.each([0, 0.99])("resolves and clears six-month care with random %s", (roll) => {
    let crop = tree(newLongTermYoung());
    crop = required(prepareRubberMaintenance(crop)).crop;
    crop = tick(tick(crop)); // month 3
    crop = required(prepareRubberMaintenance(crop)).crop;
    crop = tick(tick(crop)); // month 5
    const payment = required(prepareRubberFullMaintenance(crop));
    expect(payment.cost).toEqual({ gold: 13, silver: 0 });
    crop = payment.crop;
    expect(crop.lifecycle).toMatchObject({ payments: [
      { month: 1, weightHundredths: 100 }, { month: 3, weightHundredths: 90 },
      ...Array.from({ length: 13 }, () => ({ month: 5, weightHundredths: 75 })),
    ] });
    expect(prepareRubberMaintenance(crop)).toBeNull();
    expect(prepareRubberFullMaintenance(crop)).toBeNull();
    const random = vi.fn(() => roll);
    crop = tickRubber(crop, random);
    expect(random).not.toHaveBeenCalled();
    crop = tickRubber(crop, random);
    expect(random).toHaveBeenCalledTimes(1);
    expect(crop.lifecycle).toMatchObject({ cropMonth: 7, regularTokens: 2, bonusTokens: roll === 0 ? 1 : 0, payments: [] });
  });

  it("handles exact and surplus maturation without ticking the new adult", () => {
    const young: RubberYoung = { ...newLongTermYoung(), regularTokens: 15 };
    expect(matureRubberIfReady(young)).toBe(young);
    expect(matureRubberIfReady({ ...young, regularTokens: 16 })).toEqual(newRubberAdultCycle());
    expect(matureRubberIfReady({ ...young, regularTokens: 16, bonusTokens: 1 })).toMatchObject({
      stage: "ready", cycleMonth: 3, progress: 1, yieldResult: "low", fromOverflow: true, previousCyclePenalty: false,
    });
    expect(tick(tree({ ...young, cropMonth: 47 })).lifecycle).toEqual(newRubberAdultCycle());
    const surplus = tick(tree({ ...young, cropMonth: 47, bonusTokens: 1 }));
    expect(surplus.lifecycle).toMatchObject({ cycleMonth: 3, fromOverflow: true });
    expect(prepareRubberMaintenance(surplus)).toBeNull();
    expect(prepareRubberFullMaintenance(surplus)).toBeNull();
  });
});

describe("rubber adult care and cadence", () => {
  it.each([
    [1, 0.99, "high", 0], [2, 0.7499, "high", 1], [2, 0.75, "low", 1],
  ] as const)("funds month %s and resolves random %s once", (month, roll, result, calls) => {
    let crop = tree();
    if (month === 2) crop = tick(crop);
    crop = required(prepareRubberFullMaintenance(crop)).crop;
    expect(crop.lifecycle).toMatchObject({ payments: [{ month, weightHundredths: month === 1 ? 100 : 75 }] });
    expect(prepareRubberMaintenance(crop)).toBeNull();
    const random = vi.fn(() => roll);
    for (let i = month; i < 3; i++) crop = tickRubber(crop, random);
    expect(crop.lifecycle).toMatchObject({ cycleMonth: 3, progress: 1, yieldResult: result });
    expect(prepareRubberMaintenance(crop)).toBeNull();
    const tapped = required(prepareRubberTapping(crop));
    prepareRubberTapping(crop); // repeated UI proposal cannot reroll
    crop = required(prepareRubberHauling(tapped.crop)).crop;
    crop = tickRubber(crop, random);
    expect(random).toHaveBeenCalledTimes(calls);
    expect(crop.lifecycle).toMatchObject({ cycleMonth: 1, payments: [], progress: 0, previousCyclePenalty: false, lateTappingAvailable: false });
    expect(prepareRubberMaintenance(crop)).not.toBeNull();
  });

  it("keeps cycling without care or tapping and never stacks the penalty", () => {
    let crop = tree();
    const random = vi.fn(() => 0);
    for (let cycle = 1; cycle <= 4; cycle++) {
      expect(crop.lifecycle).toMatchObject({ cycleMonth: 1, previousCyclePenalty: cycle > 1, lateTappingAvailable: cycle > 1 });
      crop = tickRubber(crop, random);
      expect(crop.lifecycle).toMatchObject({ cycleMonth: 2, lateTappingAvailable: false });
      crop = tickRubber(crop, random);
      expect(crop.lifecycle).toMatchObject({ cycleMonth: 3, yieldResult: "low" });
      const tapped = required(prepareRubberTapping(crop));
      expect(required(prepareRubberHauling(tapped.crop)).quantity).toBe(cycle === 1 ? 2 : 1);
      crop = tickRubber(crop, random);
    }
    expect(random).not.toHaveBeenCalled();
  });
});

describe("rubber tapping and independent hauling", () => {
  it.each([false, true])("expires unhauled rubber before the next tapping window (late: %s)", (late) => {
    let crop = tree(ready());
    for (let cycle = 0; cycle < 3; cycle++) {
      if (late) crop = tick(crop);
      expect(crop.lifecycle).toMatchObject({ batch: null });
      crop = required(prepareRubberTapping(crop)).crop;
      expect(crop.lifecycle).toMatchObject({ batch: { advancesSinceTapping: 0 } });
      expect(prepareRubberTapping(crop)).toBeNull();
      crop = tick(tick(crop));
      expect(crop.lifecycle).toMatchObject({ batch: null });
      expect(prepareRubberHauling(crop)).toBeNull();
      if (!late) crop = tick(crop);
      expect(crop.lifecycle).toMatchObject({ stage: "ready", cycleMonth: 3 });
    }
  });

  it.each([
    ["high", false, 3], ["low", false, 2], ["high", true, 2], ["low", true, 1],
  ] as const)("taps %s with penalty %s for %s", (result, penalty, quantity) => {
    const crop = tree(ready(result, penalty));
    const tapped = required(prepareRubberTapping(crop));
    expect(tapped.cost).toEqual({ gold: 1, silver: 0 });
    expect(crop.lifecycle).toMatchObject({ tappedOnTime: false, batch: null });
    expect(prepareRubberTapping(tapped.crop)).toBeNull();
    const hauled = required(prepareRubberHauling(tapped.crop));
    expect(hauled.quantity).toBe(quantity);
    expect(hauled.cost).toEqual({ gold: 1, silver: 0 });
    expect(prepareRubberTapping(hauled.crop)).toBeNull();
    expect(prepareRubberHauling(hauled.crop)).toBeNull();
    expect(tick(hauled.crop).lifecycle).toMatchObject({ previousCyclePenalty: false });
    const delayed = tick(tapped.crop);
    expect(delayed.lifecycle).toMatchObject({ cycleMonth: 1, previousCyclePenalty: false,
      batch: { quantity: quantity - 1, advancesSinceTapping: 1 } });
    expect(prepareRubberHauling(delayed)?.quantity ?? 0).toBe(quantity - 1);
    const expired = tick(delayed);
    expect(expired.lifecycle).toMatchObject({ cycleMonth: 2, batch: null, previousCyclePenalty: false });
    expect(prepareRubberHauling(expired)).toBeNull();
  });

  it.each([false, true])("late tapping always yields one with source penalty %s", (penalty) => {
    let crop = tick(tree(ready("high", penalty)));
    expect(crop.lifecycle).toMatchObject({ cycleMonth: 1, previousCyclePenalty: true, lateTappingAvailable: true });
    crop = required(prepareRubberMaintenance(crop)).crop;
    crop = required(prepareRubberTapping(crop)).crop;
    expect(crop.lifecycle).toMatchObject({ tappedOnTime: false, lateTappingAvailable: false, previousCyclePenalty: true, payments: [{ month: 1, weightHundredths: 100 }] });
    expect(required(prepareRubberHauling(crop)).quantity).toBe(1);
    expect(prepareRubberTapping(crop)).toBeNull();
    expect(prepareRubberTapping(required(prepareRubberHauling(crop)).crop)).toBeNull();
    crop = tick(crop);
    expect(crop.lifecycle).toMatchObject({ cycleMonth: 2, batch: { quantity: 0, advancesSinceTapping: 1 } });
    expect(prepareRubberHauling(crop)).toBeNull();
    crop = tick(crop);
    expect(crop.lifecycle).toMatchObject({ cycleMonth: 3, batch: null, yieldResult: "high", previousCyclePenalty: true });
    crop = required(prepareRubberTapping(crop)).crop;
    expect(required(prepareRubberHauling(crop)).quantity).toBe(2);
    expect(tick(crop).lifecycle).toMatchObject({ previousCyclePenalty: false });
  });

  it("rejects wrong phases, missing batches and expired opportunities", () => {
    for (const crop of [createCrop("rubber", "p", 1, 1), tree(newLongTermYoung()), tree(), tick(tree())]) {
      expect(prepareRubberTapping(crop)).toBeNull();
      expect(prepareRubberHauling(crop)).toBeNull();
    }
    const expired = tick(tick(tree(ready())));
    expect(expired.lifecycle).toMatchObject({ cycleMonth: 2, lateTappingAvailable: false });
    expect(prepareRubberTapping(expired)).toBeNull();
  });

  it.each(["on-time", "late", "skipped"])("handles surplus %s with ordinary penalties and timers", (mode) => {
    let crop = tree(matureRubberIfReady({ ...newLongTermYoung(), regularTokens: 16, bonusTokens: 1 }));
    if (mode === "on-time") {
      crop = required(prepareRubberTapping(crop)).crop;
      expect(required(prepareRubberHauling(crop)).quantity).toBe(2);
    }
    crop = tick(crop);
    expect(crop.lifecycle).toMatchObject({ cycleMonth: 1, previousCyclePenalty: mode !== "on-time", lateTappingAvailable: mode !== "on-time" });
    if (mode === "late") {
      crop = required(prepareRubberTapping(crop)).crop;
      expect(required(prepareRubberHauling(crop)).quantity).toBe(1);
    }
    crop = tick(crop);
    expect(prepareRubberTapping(crop)).toBeNull();
    expect(prepareRubberHauling(crop)).toBeNull();
    crop = tick(crop);
    expect(crop.lifecycle).toMatchObject({ batch: null, cycleMonth: 3, yieldResult: "low" });
    const tapped = required(prepareRubberTapping(crop));
    expect(required(prepareRubberHauling(tapped.crop)).quantity).toBe(mode === "on-time" ? 2 : 1);
  });
});

it("describes collection only for hauling without mutating the input", () => {
  const crop = tree(ready());
  const tapped = required(prepareRubberProduction(crop, "tapping"));
  expect(tapped.collectedProduce).toBeUndefined();
  expect(crop.lifecycle).toMatchObject({ tappedOnTime: false, batch: null });

  const hauled = required(prepareRubberProduction(tapped.crop, "hauling"));
  expect(hauled.collectedProduce).toEqual({ kind: "rubber", quantity: 3 });
  expect(hauled.crop.lifecycle).toMatchObject({ batch: null });
  expect(tapped.crop.lifecycle).toMatchObject({ batch: { quantity: 3 } });
  expect(prepareRubberProduction(hauled.crop, "hauling")).toBeNull();
});

it("rejects unsupported production tasks and unavailable hauling", () => {
  for (const task of ["harvesting", undefined, {}, "toString"]) {
    expect(prepareRubberProduction(tree(ready()), task)).toBeNull();
  }
  expect(prepareRubberProduction(tree(ready()), "hauling")).toBeNull();
  const late = required(prepareRubberProduction(tick(tree(ready())), "tapping")).crop;
  expect(prepareRubberProduction(tick(late), "hauling")).toBeNull();
});

it("reports only the rubber remaining after delayed hauling", () => {
  const tapped = required(prepareRubberProduction(tree(ready()), "tapping")).crop;
  const delayed = tick(tapped);
  const payment = required(prepareRubberProduction(delayed, "hauling"));
  expect(payment.collectedProduce).toEqual({ kind: "rubber", quantity: 2 });
  expect(delayed.lifecycle).toMatchObject({ batch: { quantity: 2 } });
  expect(payment.crop.lifecycle).toMatchObject({ batch: null });
});
