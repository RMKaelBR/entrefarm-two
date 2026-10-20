import { describe, expect, it, vi } from "vitest";
import { createCrop } from "./crop-functions";
import type { CoconutAdult, CoconutCrop, CoconutYoung } from "./crop-types";
import { adultProgress, bonusChance, canCollectCoconut, coconutYield, matureIfReady, newAdultCycle,
  paymentPoints, pointTotal, prepareCoconutDevelopment, prepareCoconutMaintenance, prepareCoconutProduction,
  finishAdultCycle, tickAdult, tickCoconut, tickYoung, youngProgress } from "./coconut-functions";

const young = (patch: Partial<CoconutYoung> = {}): CoconutYoung => ({ phase: "young", cropMonth: 1, regularTokens: 0, bonusTokens: 0, payments: [], ...patch });
const ready = (yieldResult: "high" | "low" = "high", readyAge: 0 | 1 | 2 = 0): CoconutAdult =>
  ({ ...newAdultCycle(), stage: "ready", cycleMonth: 3, yieldResult, readyAge, fromOverflow: false });
const crop = (lifecycle: CoconutCrop["lifecycle"]): CoconutCrop => ({ ...createCrop("coconut", "p", 1, 1), lifecycle });

describe("coconut preparation and young growth", () => {
  it("freezes preparation and starts month one only after all costs", () => {
    let tree = createCrop("coconut", "p", 1, 1);
    const random = vi.fn();
    expect(tickCoconut(tree, random)).toBe(tree);
    expect(prepareCoconutMaintenance(tree)).toBeNull();
    for (const task of ["siteClearing", "hauling", "planting"] as const) {
      const proposal = prepareCoconutDevelopment(tree, task)!;
      expect(proposal.cost).toEqual({ gold: 1, silver: 0 });
      tree = proposal.crop;
      expect(prepareCoconutDevelopment(tree, task)).toBeNull();
    }
    expect(tree.lifecycle).toEqual(young());
    expect(random).not.toHaveBeenCalled();
  });
  it("awards arrival-month regular tokens and settles only after month six", () => {
    let life: CoconutCrop["lifecycle"] = young();
    const random = vi.fn();
    for (let month = 2; month <= 13; month++) {
      if (life.phase !== "young") throw new Error("Expected young");
      life = tickYoung(life, random);
      expect(life).toMatchObject({ cropMonth: month, regularTokens: Math.floor(month / 3), bonusTokens: 0 });
    }
    expect(random).not.toHaveBeenCalled();
  });
  it.each([[1, 100], [2, 100], [3, 90], [4, 90], [5, 75], [6, 75], [7, 100], [12, 75]])("weights month %i as %i hundredths", (month, points) => {
    expect(paymentPoints(month)).toBe(points);
  });
  it("keeps original payment values and rejects a ninth payment", () => {
    let tree = crop(young());
    for (const month of [1, 2, 3, 4, 5, 6, 6, 6]) {
      if (tree.lifecycle.phase !== "young") throw new Error("Expected young");
      tree = prepareCoconutMaintenance({ ...tree, lifecycle: { ...tree.lifecycle, cropMonth: month } })!.crop;
    }
    if (tree.lifecycle.phase !== "young") throw new Error("Expected young");
    expect(tree.lifecycle.payments.map((p) => p.pointHundredths)).toEqual([100, 100, 90, 90, 75, 75, 75, 75]);
    expect(pointTotal(tree.lifecycle)).toBe(680);
    expect(bonusChance(tree.lifecycle)).toBe(0.85);
    expect(prepareCoconutMaintenance(tree)).toBeNull();
  });
  it.each([[0.749999, 1], [0.75, 0]])("includes month-six funding and rolls once at %f", (roll, bonus) => {
    const random = vi.fn(() => roll);
    const next = tickYoung(young({ cropMonth: 6, regularTokens: 2,
      payments: Array.from({ length: 8 }, () => ({ cropMonth: 6, pointHundredths: 75 })) }), random);
    expect(next).toMatchObject({ cropMonth: 7, bonusTokens: bonus, regularTokens: 2, payments: [] });
    expect(random).toHaveBeenCalledTimes(1);
    if (next.phase !== "young") throw new Error("Expected young");
    tickYoung(next, random);
    expect(random).toHaveBeenCalledTimes(1);
  });
  it("guarantees eight early points without randomness and reopens slots", () => {
    const random = vi.fn();
    const next = tickYoung(young({ cropMonth: 6, payments: Array.from({ length: 8 }, () => ({ cropMonth: 1, pointHundredths: 100 })) }), random);
    expect(next).toMatchObject({ cropMonth: 7, bonusTokens: 1, payments: [] });
    expect(prepareCoconutMaintenance(crop(next))).not.toBeNull();
    expect(random).not.toHaveBeenCalled();
  });
  it("matures at 32 without double ticking or transferring maintenance", () => {
    const tree = crop(young({ cropMonth: 95, regularTokens: 31, payments: [{ cropMonth: 95, pointHundredths: 75 }] }));
    const next = tickCoconut(tree, vi.fn());
    expect(next).toEqual({ ...tree, lifecycle: newAdultCycle() });
    expect(adultProgress(newAdultCycle())).toBe(0);
  });
  it("caps defensive surplus to one fixed-low ready harvest", () => {
    const source = young({ regularTokens: 32, bonusTokens: 5 });
    expect(youngProgress(source)).toBe(32);
    const life = matureIfReady(source);
    expect(life).toMatchObject({ stage: "ready", readyAge: 0, fromOverflow: true, yieldResult: "low", fmPaidMonth: null });
    if (life.phase !== "adult") throw new Error("Expected adult");
    expect(adultProgress(life)).toBe(1);
    expect(canCollectCoconut(life)).toBe(false);
    expect(prepareCoconutMaintenance(crop(life))).toBeNull();
  });
});

describe("adult coconut cycles", () => {
  it.each([[null, 0, "low", 0], [1, 0.99, "high", 0], [2, 0.749999, "high", 1], [2, 0.75, "low", 1]] as const)("resolves funding %s with roll %f", (fmPaidMonth, roll, result, calls) => {
    const random = vi.fn(() => roll);
    const monthTwo = tickAdult({ ...newAdultCycle(), fmPaidMonth }, random);
    expect(monthTwo).toMatchObject({ stage: "growing", cycleMonth: 2 });
    const harvest = tickAdult(monthTwo, random);
    expect(harvest).toMatchObject({ stage: "ready", readyAge: 0, yieldResult: result });
    coconutYield(harvest); canCollectCoconut(harvest);
    expect(prepareCoconutMaintenance(crop(harvest))).toBeNull();
    expect(tickAdult(tickAdult(harvest, random), random)).toMatchObject({ yieldResult: result, readyAge: 2 });
    expect(random).toHaveBeenCalledTimes(calls);
  });
  it.each(["high", "low"] as const)("uses %s yields through both fallen months then loses", (result) => {
    let life = ready(result);
    const random = vi.fn();
    for (const age of [0, 1, 2]) {
      expect(coconutYield(life)).toBe((result === "high" ? 3 : 2) - (age > 0 ? 1 : 0));
      expect(canCollectCoconut({ ...life, production: { climbingPiling: false, husking: true, hauling: true } })).toBe(age > 0);
      life = tickAdult(life, random);
    }
    expect(life).toMatchObject({ stage: "resting", lastHarvest: { outcome: "lost", quantity: 0 } });
    expect(life).not.toHaveProperty("cycleMonth");
    expect(random).not.toHaveBeenCalled();
  });
  it.each(["collected", "lost"] as const)("starts an unfunded cycle on the next advance after %s", (outcome) => {
    const quantity = outcome === "lost" ? 0 : 3;
    const resting = finishAdultCycle(outcome, quantity);
    expect(resting).toEqual({ phase: "adult", stage: "resting", fmPaidMonth: null,
      production: { climbingPiling: false, husking: false, hauling: false }, lastHarvest: { outcome, quantity } });
    expect(adultProgress(resting)).toBe(0);
    expect(coconutYield(resting)).toBe(0);
    expect(canCollectCoconut(resting)).toBe(false);
    expect(prepareCoconutMaintenance(crop(resting))).toBeNull();
    expect(prepareCoconutProduction(crop(resting), "husking")).toBeNull();
    const random = vi.fn();
    const monthOne = tickAdult(resting, random);
    expect(monthOne).toEqual({ ...newAdultCycle(), lastHarvest: { outcome, quantity } });
    const monthTwo = tickAdult(monthOne, random);
    expect(monthTwo).toMatchObject({ stage: "growing", cycleMonth: 2 });
    expect(tickAdult(monthTwo, random)).toMatchObject({ stage: "ready", cycleMonth: 3, yieldResult: "low" });
    expect(random).not.toHaveBeenCalled();
  });
  it("rejects invalid, inherited, duplicate, wrong-phase, and waived tasks", () => {
    for (const task of ["toString", "__proto__", "constructor", "unknown", null]) {
      expect(prepareCoconutDevelopment(createCrop("coconut", "p", 1, 1), task)).toBeNull();
      expect(prepareCoconutProduction(crop(ready()), task)).toBeNull();
    }
    expect(prepareCoconutProduction(crop(young()), "husking")).toBeNull();
    expect(prepareCoconutProduction(crop(newAdultCycle()), "husking")).toBeNull();
    expect(prepareCoconutDevelopment(crop(ready()), "planting")).toBeNull();
    for (const life of [newAdultCycle(), tickAdult(newAdultCycle(), vi.fn())]) {
      const paid = prepareCoconutMaintenance(crop(life))!.crop;
      expect(prepareCoconutMaintenance(paid)).toBeNull();
    }
    for (const age of [1, 2] as const) expect(prepareCoconutProduction(crop(ready("high", age)), "climbingPiling")).toBeNull();
    const paid = prepareCoconutProduction(crop(ready()), "climbingPiling")!.crop;
    expect(prepareCoconutProduction(paid, "climbingPiling")).toBeNull();
    expect(tickCoconut(paid, vi.fn()).lifecycle).toMatchObject({ readyAge: 1, production: { climbingPiling: true } });
  });
});
