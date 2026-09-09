import type { Land } from "../land/land-types";
import type { Currency } from "../types";

export type Loan = {
  id: string;
  collateralLandId: Land["id"];
  outstandingBalance: Currency;
  originatedYear: number;
  lastAccruedYear: number | null;
  status: "active" | "pending";
};
