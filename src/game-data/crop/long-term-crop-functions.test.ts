import { describe, expect, it, vi } from "vitest";
import { COCONUT_CARD, FRUIT_CARD, LONG_TERM_RULES } from "./long-term-crop-data";
import { createCrop } from "./crop-functions";
import { advanceYoungTrack, newLongTermYoung, prepareLongTermPreparation, prepareYoungMaintenance } from "./long-term-crop-functions";

describe("shared long-term development", () => {
  it("creates independent preparation records and young payment arrays", () => {
    const coconut = createCrop("coconut", "a", 1, 1);
    const fruit = createCrop("fruit", "b", 1, 1);
    if (coconut.lifecycle.phase !== "development" || fruit.lifecycle.phase !== "development") throw new Error("Expected preparation");
    coconut.lifecycle.development.siteClearing = true;
    expect(fruit.lifecycle.development.siteClearing).toBe(false);
    const young = newLongTermYoung();
    young.payments.push({ month: 1, weightHundredths: 100 });
    expect(newLongTermYoung().payments).toEqual([]);
  });

  it.each([COCONUT_CARD, FRUIT_CARD])("returns independent preparation costs and leaves source state unchanged", (card) => {
    const crop = createCrop("coconut", "a", 1, 1);
    if (crop.lifecycle.phase !== "development") throw new Error("Expected preparation");
    expect(prepareLongTermPreparation(crop.lifecycle, card.developmentCosts, "hauling")).toBeNull();
    const proposal = prepareLongTermPreparation(crop.lifecycle, card.developmentCosts, "seedlingHauling")!;
    expect(proposal.cost).toEqual({ gold: 1, silver: 0 });
    proposal.cost.gold = 99;
    expect(card.developmentCosts.seedlingHauling.gold).toBe(1);
    expect(crop.lifecycle.development.seedlingHauling).toBe(false);
    expect(proposal.state).toMatchObject({ development: { seedlingHauling: true } });
  });

  it.each([8, 15])("funds %i slots without mutating earlier proposals or shared cost", (slots) => {
    const young = newLongTermYoung();
    const single = prepareYoungMaintenance(young, slots)!;
    const full = prepareYoungMaintenance({ ...single.state, cropMonth: 3 }, slots, "all")!;
    expect(full.cost).toEqual({ gold: slots - 1, silver: 0 });
    expect(full.state.payments).toEqual([
      { month: 1, weightHundredths: 100 },
      ...Array.from({ length: slots - 1 }, () => ({ month: 3, weightHundredths: 90 })),
    ]);
    expect(young.payments).toEqual([]);
    expect(single.state.payments).toHaveLength(1);
    expect(prepareYoungMaintenance(full.state, slots)).toBeNull();
    full.cost.gold = 99;
    expect(LONG_TERM_RULES.maintenanceCost).toEqual({ gold: 1, silver: 0 });
    expect(single.cost).toEqual({ gold: 1, silver: 0 });
  });

  it("preserves surplus young growth for crop-specific maturation without mutating its input", () => {
    const young = { ...newLongTermYoung(), cropMonth: 6, regularTokens: 32,
      payments: Array.from({ length: 8 }, () => ({ month: 1, weightHundredths: 100 as const })) };
    const random = vi.fn();
    const next = advanceYoungTrack(young, 8, random);
    expect(next).toMatchObject({ phase: "young", cropMonth: 7, regularTokens: 32, bonusTokens: 1, payments: [] });
    expect(young.cropMonth).toBe(6);
    expect(young.payments).toHaveLength(8);
    expect(young.bonusTokens).toBe(0);
    expect(random).not.toHaveBeenCalled();
  });
});
