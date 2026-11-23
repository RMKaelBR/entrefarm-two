import { describe, expect, it } from "vitest";
import { createCrop } from "./crop-functions";
import { matureBananaIfReady, newBananaAdultCycle, bananaHighChance, prepareBananaFullMaintenance, prepareBananaMaintenance, prepareBananaProduction, tickBananaAdult } from "./banana-functions";
import { newLongTermYoung } from "./long-term-crop-functions";
import type { BananaCrop, BananaYoung } from "./crop-types";
import { makeYield } from "../yield/calculate-yield";

const crop = () => createCrop("banana", "land", 1, 12);
const withLife = (lifecycle: BananaCrop["lifecycle"]): BananaCrop => ({ ...crop(), lifecycle });
describe("banana lifecycle", () => {
  it("keeps payment weights and resolves adult care at 50%, 37.5%, 87.5%, and 100%", () => {
    let adult = newBananaAdultCycle();
    adult = prepareBananaMaintenance(withLife(adult))!.crop.lifecycle as typeof adult;
    expect(bananaHighChance(adult)).toBe(0.5);
    adult = tickBananaAdult(adult, () => 0.99);
    const second = prepareBananaMaintenance(withLife(adult))!.crop.lifecycle as typeof adult;
    expect(second.payments[0]).toMatchObject({ month: 1, weightHundredths: 100 });
    expect(second.payments[1]).toMatchObject({ month: 2, weightHundredths: 75 });
    expect(bananaHighChance(second)).toBe(0.875);
    const resolved = tickBananaAdult(second, () => 0.8);
    expect(resolved.stage).toBe("ready");
    if (resolved.stage === "ready") expect(resolved.yieldResult).toBe("high");
    const monthTwoOnly = { ...adult, payments: [{ month: 2, weightHundredths: 75 as const }] };
    expect(bananaHighChance(monthTwoOnly)).toBe(0.375);
    const fullyFunded = { ...adult, payments: [{ month: 1, weightHundredths: 100 as const }, { month: 1, weightHundredths: 100 as const }] };
    expect(bananaHighChance(fullyFunded)).toBe(1);
    const guaranteed = tickBananaAdult(fullyFunded, () => 1);
    expect(guaranteed.stage).toBe("ready");
    if (guaranteed.stage === "ready") expect(guaranteed.yieldResult).toBe("high");
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
    const growing = { ...newBananaAdultCycle(), cycleMonth: 2 as const,
      payments: [{ month: 1, weightHundredths: 100 as const }, { month: 2, weightHundredths: 75 as const }] };
    const ready = tickBananaAdult(growing, () => { throw new Error("full chance must not reroll"); });
    expect(ready).toMatchObject({ stage: "ready", cycleMonth: 3, progress: 1 });
    const readyCrop = withLife(ready);
    expect(prepareBananaProduction(readyCrop, "hauling")).toBeNull();
    const harvested = prepareBananaProduction(readyCrop, "harvesting")!;
    expect(prepareBananaProduction(harvested.crop, "harvesting")).toBeNull();
    expect(prepareBananaProduction(harvested.crop, "hauling")!.collectedProduce?.quantity).toEqual(makeYield(7));
    expect(tickBananaAdult(ready, () => 0)).toMatchObject({ stage: "growing", cycleMonth: 1, payments: [], batch: null });
    expect(tickBananaAdult(harvested.crop.lifecycle as typeof ready, () => 0).cycleMonth).toBe(1);
  });
});
