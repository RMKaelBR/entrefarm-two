import type { Yield } from "./yield-types";

function safeInteger(value: number): void {
  if (!Number.isSafeInteger(value)) throw new RangeError("Yield values must be safe integers");
}
function safeTotal(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError("Yield total exceeds the safe integer range");
  }
  return Number(value);
}
export function yieldToTenths(value: Yield): number {
  safeInteger(value.whole);
  safeInteger(value.tenths);
  return safeTotal(BigInt(value.whole) * BigInt(10) + BigInt(value.tenths));
}
export function tenthsToYield(total: number): Yield {
  safeInteger(total);
  const remainder = total % 10;
  return { whole: Math.floor(total / 10) || 0,
    tenths: remainder < 0 ? remainder + 10 : remainder === 0 ? 0 : remainder };
}
export const makeYield = (whole: number, tenths = 0): Yield =>
  tenthsToYield(yieldToTenths({ whole, tenths }));
export const normalizeYield = (value: Yield): Yield => tenthsToYield(yieldToTenths(value));
export const addYield = (a: Yield, b: Yield): Yield =>
  tenthsToYield(safeTotal(BigInt(yieldToTenths(a)) + BigInt(yieldToTenths(b))));
export const subYield = (a: Yield, b: Yield): Yield =>
  tenthsToYield(safeTotal(BigInt(yieldToTenths(a)) - BigInt(yieldToTenths(b))));
export function compareYield(a: Yield, b: Yield): -1 | 0 | 1 {
  const left = yieldToTenths(a), right = yieldToTenths(b);
  return left < right ? -1 : left > right ? 1 : 0;
}
export function formatYield(value: Yield): string {
  const total = yieldToTenths(value);
  const magnitude = Math.abs(total);
  const whole = Math.floor(magnitude / 10);
  const tenths = magnitude % 10;
  return `${total < 0 ? "-" : ""}${whole}${tenths ? `.${tenths}` : ""}`;
}
