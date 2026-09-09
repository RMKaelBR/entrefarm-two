import type { Land } from "../land/land-types";
import { multiplyCurrencyRatio } from "../money/calculate-money";
import type { Currency } from "../types";
import { ANNUAL_INTEREST_RATIO, LOAN_TO_VALUE_RATIO } from "./loan-data";
import type { Loan } from "./loan-types";

export const calculateLoanPrincipal = (value: Currency): Currency =>
  multiplyCurrencyRatio(value, LOAN_TO_VALUE_RATIO.numerator, LOAN_TO_VALUE_RATIO.denominator);

export const calculateAmountDue = (balance: Currency): Currency =>
  multiplyCurrencyRatio(balance, ANNUAL_INTEREST_RATIO.numerator, ANNUAL_INTEREST_RATIO.denominator);

export const findLoanForLand = (loans: Loan[], landId: Land["id"]) =>
  loans.find((loan) => loan.collateralLandId === landId);

export const canUseLandAsCollateral = (loans: Loan[], landId: Land["id"]) =>
  !findLoanForLand(loans, landId);

export const createLoan = (land: Land, year: number): Loan => ({
  id: crypto.randomUUID(),
  collateralLandId: land.id,
  outstandingBalance: calculateLoanPrincipal(land.currentValue),
  originatedYear: year,
  lastAccruedYear: null,
  status: "active",
});

export const accrueLoanForYear = (loan: Loan, year: number): Loan => {
  if (loan.status === "pending" || loan.lastAccruedYear === year) return loan;
  return {
    ...loan,
    outstandingBalance: calculateAmountDue(loan.outstandingBalance),
    lastAccruedYear: year,
    status: "pending",
  };
};

export const carryOverLoan = (loan: Loan): Loan => ({ ...loan, status: "active" });
