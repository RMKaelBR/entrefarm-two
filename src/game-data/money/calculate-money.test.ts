import { describe, expect, it } from "vitest";
import {
  canAffordCurrency,
  currencyToSilver,
  multiplyCurrencyRatio,
  silverToCurrency,
} from "./calculate-money";

describe("exact currency helpers", () => {
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
