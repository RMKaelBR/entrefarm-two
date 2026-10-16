import { describe, expect, it } from "vitest";
import {
  canAffordCurrency,
  currencyToSilver,
  gold,
  multiplyCurrencyRatio,
  silver,
  silverToCurrency,
} from "./calculate-money";

describe("exact currency helpers", () => {
  it("constructs whole gold amounts", () => {
    expect(gold(2)).toEqual({ gold: 2, silver: 0 });
    expect(gold(0)).toEqual({ gold: 0, silver: 0 });
  });

  it("constructs and normalizes whole silver amounts", () => {
    expect(silver(5)).toEqual({ gold: 0, silver: 5 });
    expect(silver(12)).toEqual({ gold: 1, silver: 2 });
    expect(silver(10)).toEqual({ gold: 1, silver: 0 });
    expect(silver(0)).toEqual({ gold: 0, silver: 0 });
  });

  it("converts between currency and silver", () => {
    expect(currencyToSilver({ gold: 4, silver: 7 })).toBe(47);
    expect(silverToCurrency(47)).toEqual({ gold: 4, silver: 7 });
  });

  it("compares mixed gold and silver amounts", () => {
    expect(canAffordCurrency({ gold: 3, silver: 9 }, { gold: 4, silver: 0 })).toBe(false);
    expect(canAffordCurrency({ gold: 3, silver: 10 }, { gold: 4, silver: 0 })).toBe(true);
  });

  it("multiplies whole and mixed values and rounds upward to one silver", () => {
    expect(multiplyCurrencyRatio({ gold: 20, silver: 0 }, 1, 2)).toEqual({ gold: 10, silver: 0 });
    expect(multiplyCurrencyRatio({ gold: 12, silver: 5 }, 1, 2)).toEqual({ gold: 6, silver: 3 });
    expect(multiplyCurrencyRatio({ gold: 0, silver: 3 }, 1, 2)).toEqual({ gold: 0, silver: 2 });
  });
});
