import { Currency } from "../types";

const normalize = (c: Currency): Currency => {
  let { gold, silver } = c;

  // carry silver -> gold
  if (silver >= 10) {
    const carry = Math.floor(silver / 10);
    gold += carry;
    silver = silver % 10;
  }

  // borrow gold -> silver
  if (silver < 0) {
    const borrow = Math.ceil(Math.abs(silver) / 10);
    gold -= borrow;
    silver += borrow * 10;
  }

  return { gold, silver };
};

export const addCurrency = (a: Currency, b: Currency): Currency =>
  normalize({ gold: a.gold + b.gold, silver: a.silver + b.silver });

export const subCurrency = (a: Currency, b: Currency): Currency =>
  normalize({ gold: a.gold - b.gold, silver: a.silver - b.silver });

export const currencyToSilver = ({ gold, silver }: Currency): number =>
  gold * 10 + silver;

export const silverToCurrency = (silver: number): Currency => ({
  gold: Math.floor(silver / 10),
  silver: silver % 10,
});

/** Standard constructor for whole, non-negative gold amounts. */
export const gold = (amount: number): Currency => ({ gold: amount, silver: 0 });

/** Standard constructor for whole, non-negative silver amounts; carries into gold. */
export const silver = (amount: number): Currency => silverToCurrency(amount);

export const canAffordCurrency = (funds: Currency, cost: Currency): boolean =>
  currencyToSilver(funds) >= currencyToSilver(cost);

export const multiplyCurrencyRatio = (
  amount: Currency,
  numerator: number,
  denominator: number,
): Currency => silverToCurrency(
  Math.ceil((currencyToSilver(amount) * numerator) / denominator),
);
