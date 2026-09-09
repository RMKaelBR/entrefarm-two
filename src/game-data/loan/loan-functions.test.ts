import { describe, expect, it } from "vitest";
import { createLand, withLandCurrentValue } from "../land/land-functions";
import {
  accrueLoanForYear,
  calculateAmountDue,
  calculateLoanPrincipal,
  canUseLandAsCollateral,
  carryOverLoan,
  createLoan,
  findLoanForLand,
} from "./loan-functions";

describe("land loan rules", () => {
  it("calculates principal and interest with upward silver rounding", () => {
    expect(calculateLoanPrincipal({ gold: 20, silver: 0 })).toEqual({ gold: 10, silver: 0 });
    expect(calculateLoanPrincipal({ gold: 12, silver: 5 })).toEqual({ gold: 6, silver: 3 });
    expect(calculateAmountDue({ gold: 6, silver: 3 })).toEqual({ gold: 7, silver: 6 });
  });

  it("creates and finds a loan and makes active or pending collateral ineligible", () => {
    const land = withLandCurrentValue(createLand("plains"), { gold: 12, silver: 5 });
    const loan = createLoan(land, 3);

    expect(loan).toMatchObject({
      collateralLandId: land.id,
      outstandingBalance: { gold: 6, silver: 3 },
      originatedYear: 3,
      lastAccruedYear: null,
      status: "active",
    });
    expect(findLoanForLand([loan], land.id)).toBe(loan);
    expect(canUseLandAsCollateral([loan], land.id)).toBe(false);
    expect(canUseLandAsCollateral([{ ...loan, status: "pending" }], land.id)).toBe(false);
  });

  it("accrues only once per year and carry-over preserves the accrued amount", () => {
    const loan = createLoan(createLand("plains"), 1);
    const accrued = accrueLoanForYear(loan, 1);
    const carried = carryOverLoan(accrued);

    expect(accrued).toMatchObject({ status: "pending", lastAccruedYear: 1 });
    expect(accrueLoanForYear(accrued, 1)).toBe(accrued);
    expect(carried).toMatchObject({
      status: "active",
      outstandingBalance: accrued.outstandingBalance,
      lastAccruedYear: 1,
    });
    expect(accrueLoanForYear(carried, 1)).toBe(carried);
    expect(accrueLoanForYear(carried, 2).outstandingBalance).not.toEqual(accrued.outstandingBalance);
  });
});
