import { describe, expect, it, vi } from "vitest";
import { createCrop, prepareCropDevelopment, prepareCropMaintenance, prepareCropProduction, tickCrops } from "./crop-functions";
import { coffeeAdultWeight, coffeeAvailableYield, coffeeCareBlockReason, coffeeHighChance, coffeeMonthIndex, newCoffeeAdult, prepareCoffeeFullMaintenance, prepareCoffeeMaintenance, prepareCoffeePreparation, prepareCoffeeProduction, tickCoffee, tickCoffeeAdult } from "./coffee-functions";
import { newLongTermYoung } from "./long-term-crop-functions";
import { makeYield } from "../yield/calculate-yield";
import type { CoffeeAdult, CoffeeCrop, CropCalendar } from "./crop-types";

const tree = (lifecycle: CoffeeCrop["lifecycle"]): CoffeeCrop => ({ ...createCrop("coffee", "land", 1, 1), lifecycle });
const atIndex = (index: number): CropCalendar => ({ year: Math.floor(index / 12) + 1, month: index % 12 + 1 });
const next = (crop: CoffeeCrop) => {
  if (crop.lifecycle.phase !== "adult") throw Error("Expected adult");
  return tickCoffee(crop, atIndex(coffeeMonthIndex(crop.lifecycle.calendar) + 1), () => 0);
};
function ready(high = true) {
  const adult = newCoffeeAdult({ year: 4, month: 1 });
  if (high) adult.payments = Array.from({ length: 8 }, () => ({ month: 2, weightHundredths: 100 }));
  return tree(tickCoffeeAdult(adult, { year: 4, month: 11 }, () => { throw Error("No draw at chance extremes"); }));
}
function harvestAt(month: number, high = true) {
  let crop = ready(high);
  while (crop.lifecycle.phase === "adult" && crop.lifecycle.calendar.month !== month) crop = next(crop);
  return crop;
}

describe("coffee development and calendar eligibility", () => {
  it.each(Array.from({ length: 12 }, (_, i) => i + 1))("keeps preparation and crop-relative growth independent of start month %s", month => {
    let crop = createCrop("coffee", "land", 1, month);
    const random = vi.fn(() => 0);
    expect(tickCoffee(crop, { year: 2, month: 1 }, random)).toBe(crop);
    expect(prepareCoffeePreparation(crop, "plowing")).toBeNull();
    let cost = 5;
    for (const task of ["siteClearing", "seedlingHauling", "planting"] as const) {
      const payment = prepareCoffeePreparation(crop, task)!;
      cost += payment.cost.gold; crop = payment.crop;
      expect(prepareCoffeePreparation(crop, task)).toBeNull();
    }
    expect(cost).toBe(9);
    expect(crop.lifecycle).toEqual(newLongTermYoung());
    crop = tickCoffee(crop, atIndex(month), random);
    expect(crop.lifecycle).toMatchObject({ cropMonth: 2, regularTokens: 0 });
    crop = tickCoffee(crop, atIndex(month + 1), random);
    expect(crop.lifecycle).toMatchObject({ cropMonth: 3, regularTokens: 1 });
    expect(random).not.toHaveBeenCalled();
  });

  it.each([
    [1, 4, 0, true], [2, 4, 1, true], [3, 4, 1, true], [4, 4, 1, true],
    [5, 5, 2, false], [6, 5, 2, false], [7, 5, 2, false], [8, 5, 3, false],
    [9, 5, 3, false], [10, 5, 3, false], [11, 5, 4, false], [12, 5, 0, true],
  ] as const)("matures in month %s and waits for its first eligible November", (month, firstEligibleHarvestYear, progress, canFund) => {
    const random = vi.fn(() => 0);
    let crop = tickCoffee(tree({ ...newLongTermYoung(), cropMonth: 23, regularTokens: 7, bonusTokens: 2,
      payments: [{ month: 23, weightHundredths: 75 }] }), { year: 4, month }, random);
    expect(crop.lifecycle).toEqual(newCoffeeAdult({ year: 4, month }));
    const life = crop.lifecycle as CoffeeAdult;
    expect(life).toMatchObject({ firstEligibleHarvestYear, progress, opportunity: null, batch: null, payments: [] });
    expect(coffeeCareBlockReason(life) === null).toBe(canFund);
    if (!canFund) expect(coffeeCareBlockReason(life)).toContain("November, year 5");
    for (let index = coffeeMonthIndex({ year: 4, month }) + 1; index <= coffeeMonthIndex({ year: firstEligibleHarvestYear, month: 11 }); index++) {
      crop = tickCoffee(crop, atIndex(index), random);
      expect((crop.lifecycle as CoffeeAdult).opportunity !== null).toBe(index === coffeeMonthIndex({ year: firstEligibleHarvestYear, month: 11 }));
    }
    expect(random).not.toHaveBeenCalled();
  });

  it.each([0, 0.99])("settles mixed young care once and resets on result %s", draw => {
    let crop = tree({ ...newLongTermYoung(), cropMonth: 6, regularTokens: 2, payments: [{ month: 1, weightHundredths: 100 }] });
    crop = prepareCoffeeFullMaintenance(crop)!.crop;
    expect(crop.lifecycle).toMatchObject({ payments: [{ month: 1, weightHundredths: 100 }, ...Array.from({ length: 13 }, () => ({ month: 6, weightHundredths: 75 }))] });
    const random = vi.fn(() => draw);
    expect(tickCoffee(crop, { year: 1, month: 7 }, random).lifecycle).toMatchObject({ cropMonth: 7, regularTokens: 2, bonusTokens: draw === 0 ? 1 : 0, payments: [] });
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("awards regular growth and guaranteed young care without drawing randomness", () => {
    const random = vi.fn();
    let crop = prepareCoffeeFullMaintenance(tree(newLongTermYoung()))!.crop;
    for (let month = 2; month <= 7; month++) crop = tickCoffee(crop, { year: 1, month }, random);
    expect(crop.lifecycle).toMatchObject({ cropMonth: 7, regularTokens: 2, bonusTokens: 1, payments: [] });
    expect(random).not.toHaveBeenCalled();
    crop = tree({ ...newLongTermYoung(), cropMonth: 6, regularTokens: 7, payments: Array.from({ length: 14 }, () => ({ month: 1, weightHundredths: 100 })) });
    expect(tickCoffee(crop, { year: 1, month: 7 }, random).lifecycle).toEqual(newCoffeeAdult({ year: 1, month: 7 }));
  });
});

describe("coffee care and independent output", () => {
  it.each([[12, 100], [1, 100], [2, 100], [3, 75], [5, 75], [6, 50], [8, 50], [9, 25], [10, 25]] as const)("weights adult care in month %s", (month, weight) => {
    expect(coffeeAdultWeight(month)).toBe(weight);
    const life = { ...newCoffeeAdult({ year: 4, month }), firstEligibleHarvestYear: 4 };
    const paid = prepareCoffeeFullMaintenance(tree(life))!;
    expect(paid.cost).toEqual({ gold: 8, silver: 0 });
    expect(coffeeHighChance(paid.crop.lifecycle as CoffeeAdult)).toBe(weight / 100);
    expect(prepareCoffeeMaintenance(paid.crop)).toBeNull();
  });

  it("stores one November draw and previews cannot reroll or restore a consumed harvest", () => {
    const adult = { ...newCoffeeAdult({ year: 4, month: 1 }), payments: [{ month: 2, weightHundredths: 100 }] } satisfies CoffeeAdult;
    const random = vi.fn(() => 0.1);
    const life = tickCoffeeAdult(adult, { year: 4, month: 11 }, random);
    expect(life.opportunity?.yieldResult).toBe("high");
    expect(tickCoffeeAdult(life, life.calendar, random)).toBe(life);
    expect(prepareCoffeeFullMaintenance(tree(life))).toBeNull();
    for (let i = 0; i < 5; i++) expect(prepareCoffeeProduction(tree(life), "harvesting")).not.toBeNull();
    const harvested = prepareCoffeeProduction(tree(life), "harvesting")!.crop;
    expect(next(harvested).lifecycle).toMatchObject({ payments: [], batch: null, opportunity: null });
    expect(prepareCoffeeProduction(harvested, "harvesting")).toBeNull();
    expect(tickCoffeeAdult(harvested.lifecycle as CoffeeAdult, life.calendar, random).opportunity).toBeNull();
    expect(random).toHaveBeenCalledTimes(1);
  });

  it.each([[11, true, 5], [12, true, 5], [1, true, 3], [2, true, 2], [11, false, 2], [12, false, 2], [1, false, 1], [2, false, 1]] as const)("locks month %s outcome %s at %s tenths", (month, high, tenths) => {
    const crop = harvestAt(month, high);
    expect(coffeeAvailableYield(crop.lifecycle as CoffeeAdult)).toEqual(makeYield(0, tenths));
    const payment = prepareCoffeeProduction(crop, "harvesting")!;
    expect(payment.cost.gold).toBe(4);
    expect(payment.collectedProduce).toBeUndefined();
    expect(payment.crop.lifecycle).toMatchObject({ batch: { stage: "harvested", quantity: makeYield(0, tenths) }, opportunity: null });
    expect(prepareCoffeeProduction(payment.crop, "hauling")).toBeNull();
  });

  it.each([11, 12, 1, 2])("enforces raw and processed deadlines for harvest month %s", month => {
    const raw = prepareCoffeeProduction(harvestAt(month), "harvesting")!.crop;
    const expiredRaw = next(raw);
    expect(expiredRaw.lifecycle).toMatchObject({ batch: null, opportunity: null });
    expect(prepareCoffeeProduction(expiredRaw, "dryingMilling")).toBeNull();
    expect(prepareCoffeeProduction(expiredRaw, "harvesting")).toBeNull();
    const processedPayment = prepareCoffeeProduction(raw, "dryingMilling")!;
    expect(processedPayment.cost.gold).toBe(4);
    const processed = processedPayment.crop;
    expect(prepareCoffeeProduction(processed, "dryingMilling")).toBeNull();
    const later = next(processed);
    const hauled = prepareCoffeeProduction(later, "hauling")!;
    expect(hauled.cost.gold).toBe(2);
    expect(hauled.collectedProduce).toEqual(prepareCoffeeProduction(processed, "hauling")!.collectedProduce);
    expect(hauled.crop.lifecycle).toMatchObject({ batch: null });
    expect(prepareCoffeeProduction(hauled.crop, "hauling")).toBeNull();
    expect(prepareCoffeeProduction(next(later), "hauling")).toBeNull();
  });

  it("preserves old opportunities and processed batches through December reset and new care", () => {
    const november = ready();
    const december = next(november);
    const paid = prepareCoffeeFullMaintenance(december)!.crop;
    expect((paid.lifecycle as CoffeeAdult).opportunity).toEqual((november.lifecycle as CoffeeAdult).opportunity);
    const processed = prepareCoffeeProduction(prepareCoffeeProduction(november, "harvesting")!.crop, "dryingMilling")!.crop;
    const batch = (processed.lifecycle as CoffeeAdult).batch;
    const funded = prepareCoffeeFullMaintenance(next(processed))!.crop;
    expect((funded.lifecycle as CoffeeAdult).batch).toBe(batch);
    expect(prepareCoffeeProduction(funded, "hauling")!.collectedProduce?.quantity).toEqual(makeYield(0, 5));
    let expired = paid;
    for (let i = 0; i < 3; i++) expired = next(expired);
    expect(expired.lifecycle).toMatchObject({ calendar: { month: 3 }, opportunity: null });
  });

  it("dispatches coffee and rejects invalid tasks without mutating input", () => {
    const crop = createCrop("coffee", "land", 1, 1);
    expect(prepareCropDevelopment(crop, "siteClearing", false)).toEqual(prepareCoffeePreparation(crop, "siteClearing"));
    expect(prepareCropMaintenance(ready())).toBeNull();
    const adult = ready(); const snapshot = structuredClone(adult);
    for (const task of [null, "toString", "__proto__", "drying", "tapping"]) expect(prepareCoffeeProduction(adult, task)).toBeNull();
    expect(prepareCropProduction(adult, "harvesting")).toEqual(prepareCoffeeProduction(adult, "harvesting"));
    expect(tickCrops([adult, crop], { year: 4, month: 12 })[1]).toBe(crop);
    expect(adult).toEqual(snapshot);
  });
});
