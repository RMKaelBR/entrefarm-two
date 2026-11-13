import { expect, it, vi } from "vitest";
import { createCrop, prepareCropDevelopment, prepareCropMaintenance, prepareCropProduction, tickCrops } from "./crop-functions";
import { cacaoAdultWeight, cacaoAvailableYield, cacaoHighChance, matureCacaoIfReady, newCacaoAdult, prepareCacaoFullMaintenance, prepareCacaoMaintenance, prepareCacaoPreparation, prepareCacaoProduction, tickCacao, tickCacaoAdult } from "./cacao-functions";
import { newLongTermYoung } from "./long-term-crop-functions";
import { makeYield } from "../yield/calculate-yield";
import type { CacaoAdult, CacaoCrop } from "./crop-types";

const noDraw = () => { throw Error("Unexpected random draw"); };
const tree = (lifecycle: CacaoCrop["lifecycle"]): CacaoCrop => ({ ...createCrop("cacao", "land", 1, 1), lifecycle });
function to(life: CacaoAdult, month: number, random = noDraw): CacaoAdult {
  while (life.adultMonth < month) {
    const scheduled = life.nextReadyAt;
    life = tickCacaoAdult(life, random);
    if (life.stage === "ready") expect(life.opportunity?.readyAt).toBe(scheduled);
  }
  return life;
}
function adult(crop: CacaoCrop): CacaoAdult {
  if (crop.lifecycle.phase !== "adult") throw Error("Expected adult");
  return crop.lifecycle;
}

it.each([
  ["siteClearing", "seedlingHauling", "planting"],
  ["planting", "siteClearing", "seedlingHauling"],
  ["seedlingHauling", "planting", "siteClearing"],
  ["siteClearing", "planting", "seedlingHauling"],
  ["planting", "seedlingHauling", "siteClearing"],
  ["seedlingHauling", "siteClearing", "planting"],
])("prepares in any order: %j %j %j without early growth", (...tasks) => {
  let crop = createCrop("cacao", "land", 4, 12);
  expect(tickCacao(crop, noDraw)).toBe(crop);
  for (const task of tasks) {
    const payment = prepareCacaoPreparation(crop, task)!;
    expect(payment.cost.gold).toBe(1);
    crop = payment.crop;
    expect(prepareCacaoPreparation(crop, task)).toBeNull();
  }
  expect(crop.lifecycle).toEqual(newLongTermYoung());
  expect(prepareCacaoPreparation(crop, "__proto__")).toBeNull();
  expect(tickCacao(tickCacao(crop, noDraw), noDraw).lifecycle).toMatchObject({ cropMonth: 3, regularTokens: 1 });
});

it("retains young weights, settles one bonus and clears care at period end", () => {
  let crop = prepareCacaoMaintenance(tree(newLongTermYoung()))!.crop;
  for (let i = 0; i < 3; i++) crop = tickCacao(crop, noDraw);
  crop = prepareCacaoMaintenance(crop)!.crop;
  crop = tickCacao(crop, noDraw);
  crop = prepareCacaoFullMaintenance(crop)!.crop;
  expect(crop.lifecycle).toMatchObject({ payments: [
    { month: 1, weightHundredths: 100 }, { month: 4, weightHundredths: 90 },
    { month: 5, weightHundredths: 75 }, { month: 5, weightHundredths: 75 },
  ] });
  expect(prepareCacaoMaintenance(crop)).toBeNull();
  crop = tickCacao(crop, noDraw);
  const random = vi.fn(() => 0.84);
  crop = tickCacao(crop, random);
  expect(random).toHaveBeenCalledTimes(1);
  expect(crop.lifecycle).toMatchObject({ cropMonth: 7, regularTokens: 2, bonusTokens: 1, payments: [] });
  const full = prepareCacaoFullMaintenance(tree(newLongTermYoung()))!.crop;
  if (full.lifecycle.phase !== "young") throw Error("Expected young");
  expect(tickCacao(tree({ ...full.lifecycle, cropMonth: 6 }), noDraw).lifecycle).toMatchObject({ bonusTokens: 1, payments: [] });
  expect(tickCacao(tree({ ...newLongTermYoung(), cropMonth: 6 }), noDraw).lifecycle).toMatchObject({ bonusTokens: 0 });
});

it.each([0, 1])("matures with %s surplus and a fresh care list without an extra adult tick", surplus => {
  const young = { ...newLongTermYoung(), regularTokens: 10, bonusTokens: 1 + surplus, payments: [{ month: 1, weightHundredths: 100 as const }] };
  expect(matureCacaoIfReady(young)).toEqual(newCacaoAdult(surplus));
  expect(tickCacao(tree({ ...young, cropMonth: 2, regularTokens: 9 }), noDraw).lifecycle).toEqual(newCacaoAdult(surplus));
  expect(matureCacaoIfReady({ ...newLongTermYoung(), regularTokens: 10 }).phase).toBe("young");
});

it("weights adult care, caps five slots, and resolves a fractional probability exactly once", () => {
  let crop = prepareCacaoMaintenance(tree(newCacaoAdult()))!.crop;
  crop = tree(to(adult(crop), 4));
  const payment = prepareCacaoFullMaintenance(crop)!;
  expect(payment.cost.gold).toBe(4);
  crop = payment.crop;
  expect(adult(crop).payments.map(p => p.weightHundredths)).toEqual([100, 75, 75, 75, 75]);
  expect(cacaoHighChance(adult(crop))).toBe(0.8);
  expect(prepareCacaoMaintenance(crop)).toBeNull();
  const random = vi.fn(() => 0.79);
  crop = tree(to(adult(crop), 6, random));
  expect(random).toHaveBeenCalledTimes(1);
  expect(prepareCacaoFullMaintenance(crop)).toBeNull();
  for (let i = 0; i < 3; i++) {
    expect(cacaoAvailableYield(adult(crop))).toEqual(makeYield(0, 2));
    expect(prepareCacaoProduction(crop, "harvesting")).not.toBeNull();
  }
  expect(random).toHaveBeenCalledTimes(1);
  crop = tickCacao(crop, noDraw);
  expect(adult(crop)).toMatchObject({ cycleMonth: 1, payments: [], opportunity: { yieldResult: "high" } });
  expect(prepareCacaoFullMaintenance(crop)?.cost.gold).toBe(5);
  expect([1, 3, 4, 6].map(cacaoAdultWeight)).toEqual([100, 100, 75, 75]);
});

for (const surplus of [0, 1]) {
  it.each(["on-time hauled", "late hauled", "unharvested lost", "raw lost", "processed lost"])(`keeps readiness independent for ${surplus} surplus: %s`, outcome => {
    const first = surplus ? 3 : 6;
    let life = to(newCacaoAdult(surplus), first);
    expect(life.opportunity?.readyAt).toBe(first);
    if (outcome !== "unharvested lost") {
      if (outcome === "late hauled") life = to(life, first + 1);
      let crop = prepareCacaoProduction(tree(life), "harvesting")!.crop;
      if (outcome !== "raw lost") crop = prepareCacaoProduction(crop, "splittingFermentingDrying")!.crop;
      if (outcome.endsWith("hauled")) crop = prepareCacaoProduction(crop, "hauling")!.crop;
      life = adult(crop);
    }
    life = to(life, first + 2);
    expect(life.opportunity).toBeNull(); expect(life.batch).toBeNull();
    expect(prepareCacaoProduction(tree(life), "hauling")).toBeNull();
    for (const month of [first + 6, first + 12]) {
      life = to(life, month);
      expect(life.opportunity?.readyAt).toBe(month);
      expect(life.nextReadyAt).toBe(month + 6);
    }
  });
}

it.each(["high", "low"] as const)("locks %s yield and always reduces late harvest to one tenth", result => {
  const growing = newCacaoAdult();
  growing.payments = [{ month: 1, weightHundredths: 100 }];
  const ready = to(growing, 6, () => result === "high" ? 0 : 0.99);
  expect(ready.opportunity?.yieldResult).toBe(result);
  expect(cacaoAvailableYield(ready)).toEqual(makeYield(0, result === "high" ? 2 : 1));
  expect(cacaoAvailableYield(to(ready, 7))).toEqual(makeYield(0, 1));
  expect(cacaoAvailableYield(to(ready, 8))).toBeNull();
});

it.each([6, 7])("requires ordered, one-time tasks and expires raw/processed batches after month %s", month => {
  const crop = tree(to(newCacaoAdult(), month));
  for (const task of ["hauling", "splittingFermentingDrying", "__proto__", "dryingMilling"]) expect(prepareCacaoProduction(crop, task)).toBeNull();
  const raw = prepareCacaoProduction(crop, "harvesting")!.crop;
  expect(adult(raw).opportunity).toBeNull();
  expect(prepareCacaoProduction(raw, "harvesting")).toBeNull();
  expect(prepareCacaoProduction(raw, "hauling")).toBeNull();
  const processed = prepareCacaoProduction(raw, "splittingFermentingDrying")!.crop;
  expect(prepareCacaoProduction(processed, "splittingFermentingDrying")).toBeNull();
  expect(adult(processed).batch?.expiresAt).toBe(month + 1);
  const hauled = prepareCacaoProduction(processed, "hauling")!;
  expect(hauled.collectedProduce).toEqual({ kind: "cacao", quantity: makeYield(0, 1) });
  expect(prepareCacaoProduction(hauled.crop, "hauling")).toBeNull();
  for (const batch of [raw, processed]) {
    const expired = tickCacao(batch, noDraw);
    expect(adult(expired).batch).toBeNull();
    expect(prepareCacaoProduction(expired, "splittingFermentingDrying")).toBeNull();
    expect(prepareCacaoProduction(expired, "hauling")).toBeNull();
    expect(prepareCacaoProduction(expired, "harvesting")).toBeNull();
  }
});

it("routes cacao through shared development, care, production and monthly dispatch", () => {
  let crop = createCrop("cacao", "land", 2, 12);
  expect(crop).toMatchObject({ kind: "cacao", startedYear: 2, startedMonth: 12, lifecycle: { phase: "development" } });
  for (const task of ["siteClearing", "seedlingHauling", "planting"]) crop = prepareCropDevelopment(crop, task, undefined)!.crop as CacaoCrop;
  expect(prepareCropMaintenance(crop)).not.toBeNull();
  expect(tickCrops([tree(newCacaoAdult())], { year: 3, month: 1 }, noDraw)[0]).toMatchObject({ lifecycle: { adultMonth: 2 } });
  expect(prepareCropProduction(tree(to(newCacaoAdult(), 6)), "harvesting")).not.toBeNull();
});
