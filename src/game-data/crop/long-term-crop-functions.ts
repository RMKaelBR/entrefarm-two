import type { MaintenancePayment } from "./crop-types";

export const maintenanceWeightTotal = (payments: readonly MaintenancePayment[]) =>
  payments.reduce((total, payment) => total + payment.weightHundredths, 0);

export const maintenanceChance = (
  payments: readonly MaintenancePayment[], slots: number,
) => maintenanceWeightTotal(payments) / (slots * 100);

export const productionProgressAfterAdvance = (
  progress: number, arrivalMonth: number, target: number, cadence: number,
) => Math.min(target, progress + (arrivalMonth % cadence === 0 ? 1 : 0));
