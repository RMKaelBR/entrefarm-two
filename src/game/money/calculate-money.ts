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
