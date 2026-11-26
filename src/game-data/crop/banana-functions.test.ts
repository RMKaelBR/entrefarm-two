import { assert, describe, expect, it, vi } from "vitest";
import { createCrop } from "./crop-functions";
import { matureBananaIfReady, newBananaAdultCycle, bananaHighChance, prepareBananaMaintenance, prepareBananaProduction, tickBananaAdult } from "./banana-functions";
import { newLongTermYoung } from "./long-term-crop-functions";
import type { BananaAdult, BananaCrop, BananaYoung } from "./crop-types";
import { makeYield } from "../yield/calculate-yield";

const crop = () => createCrop("banana", "land", 1, 12);
const withLife = (lifecycle: BananaCrop["lifecycle"]): BananaCrop => ({ ...crop(), lifecycle });
describe("banana lifecycle", () => {
  it("keeps payment weights and resolves adult care at 50%, 37.5%, 87.5%, and 100%", () => {
    const first = prepareBananaMaintenance(withLife(newBananaAdultCycle()))?.crop.lifecycle;
    assert(first?.phase === "adult");
    expect(bananaHighChance(first)).toBe(0.5);
    const monthTwo = tickBananaAdult(first, () => 0.99);
    const second = prepareBananaMaintenance(withLife(monthTwo))?.crop.lifecycle;
    assert(second?.phase === "adult");
    expect(second.payments[0]).toMatchObject({ month: 1, weightHundredths: 100 });
    expect(second.payments[1]).toMatchObject({ month: 2, weightHundredths: 75 });
    expect(bananaHighChance(second)).toBe(0.875);
    const resolved = tickBananaAdult(second, () => 0.8);
    expect(resolved).toMatchObject({ stage: "ready", yieldResult: "high" });
    const monthTwoOnly = { ...monthTwo, payments: [{ month: 2, weightHundredths: 75 as const }] };
    expect(bananaHighChance(monthTwoOnly)).toBe(0.375);
    const fullyFunded = { ...monthTwo, payments: [{ month: 1, weightHundredths: 100 as const }, { month: 1, weightHundredths: 100 as const }] };
    expect(bananaHighChance(fullyFunded)).toBe(1);
    const random = vi.fn(() => 1);
    expect(tickBananaAdult(fullyFunded, random)).toMatchObject({ stage: "ready", yieldResult: "high" });
    expect(random).not.toHaveBeenCalled();
  });

  it("starts an exact four-token tree growing and gives overflow one fixed low opportunity", () => {
    const young = { ...newLongTermYoung(), regularTokens: 4 } satisfies BananaYoung;
    const mature = matureBananaIfReady(young);
    expect(mature.phase).toBe("adult");
    if (mature.phase === "adult") expect(mature.stage).toBe("growing");
    const overflow = matureBananaIfReady({ ...young, bonusTokens: 1 });
    expect(overflow).toMatchObject({ stage: "ready", cycleMonth: 3, yieldResult: "low", fromOverflow: true });
    expect(prepareBananaMaintenance(withLife(overflow))).toBeNull();
  });

  it("fills the meter once at Month 3, expires on the next tick, and enforces harvest then haul", () => {
    const growing = {
      ...newBananaAdultCycle(),
      stage: "growing",
      cycleMonth: 2,
      payments: [{ month: 1, weightHundredths: 100 }, { month: 2, weightHundredths: 75 }],
    } satisfies BananaAdult;
    const random = vi.fn(() => 0.86);
    const ready = tickBananaAdult(growing, random);
    expect(ready).toMatchObject({ stage: "ready", cycleMonth: 3, progress: 1, yieldResult: "high" });
    expect(random).toHaveBeenCalledTimes(1);
    const readyCrop = withLife(ready);
    expect(prepareBananaProduction(readyCrop, "hauling")).toBeNull();
    const harvested = prepareBananaProduction(readyCrop, "harvesting");
    assert(harvested?.crop.lifecycle.phase === "adult");
    expect(prepareBananaProduction(harvested.crop, "harvesting")).toBeNull();
    expect(prepareBananaProduction(harvested.crop, "hauling")!.collectedProduce?.quantity).toEqual(makeYield(7));
    expect(tickBananaAdult(ready, random)).toEqual(newBananaAdultCycle());
    expect(tickBananaAdult(harvested.crop.lifecycle, random)).toEqual(newBananaAdultCycle());
    expect(random).toHaveBeenCalledTimes(1);
  });
});
