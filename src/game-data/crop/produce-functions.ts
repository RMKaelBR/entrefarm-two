import type { CropKind, ProduceToken } from "./crop-types";
import type { Yield } from "../yield/yield-types";
import { compareYield, makeYield, normalizeYield, tenthsToYield } from "../yield/calculate-yield";

export function createCropProduce(kind: CropKind, quantity: Yield): ProduceToken[] {
  const normalized = normalizeYield(quantity);
  if (compareYield(normalized, makeYield(0)) < 0) {
    throw new RangeError("Produce quantity cannot be negative");
  }
  const create = (denomination: ProduceToken["denomination"]): ProduceToken => ({
    id: crypto.randomUUID(), crop: kind, denomination,
  });
  return [
    ...Array.from({ length: normalized.whole }, () => create("whole")),
    ...Array.from({ length: normalized.tenths }, () => create("tenth")),
  ];
}

export function totalProduceYield(inventory: readonly ProduceToken[], kind: CropKind): Yield {
  const total = inventory.reduce((sum, token) => token.crop === kind
    ? sum + (token.denomination === "whole" ? 10 : 1) : sum, 0);
  return tenthsToYield(total);
}

export function consolidateProduce(inventory: readonly ProduceToken[]): ProduceToken[] {
  const counts = new Map<CropKind, number>();
  for (const token of inventory) {
    if (token.denomination === "tenth") {
      counts.set(token.crop, (counts.get(token.crop) ?? 0) + 1);
    }
  }

  const keep = new Map<CropKind, number>();
  const replacements: ProduceToken[] = [];
  for (const [kind, count] of counts) {
    keep.set(kind, count % 10);
    replacements.push(...createCropProduce(kind, makeYield(Math.floor(count / 10))));
  }

  const retained = inventory.filter((token) => {
    if (token.denomination === "whole") return true;
    const remaining = keep.get(token.crop) ?? 0;
    if (remaining === 0) return false;
    keep.set(token.crop, remaining - 1);
    return true;
  });
  return [...retained, ...replacements];
}

export function collectCropProduce(
  inventory: readonly ProduceToken[], kind: CropKind, quantity: Yield,
): ProduceToken[] {
  return consolidateProduce([...inventory, ...createCropProduce(kind, quantity)]);
}
