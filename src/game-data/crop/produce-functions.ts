import type { CropKind, ProduceInventory } from "./crop-types";
import type { Yield } from "../yield/yield-types";
import { addYield, compareYield, makeYield, normalizeYield } from "../yield/calculate-yield";

export function createProduceInventory(): ProduceInventory {
  return {
    rice: makeYield(0),
    corn: makeYield(0),
    coconut: makeYield(0),
    fruit: makeYield(0),
    rubber: makeYield(0),
  };
}

export function collectCropProduce(
  inventory: Readonly<ProduceInventory>, kind: CropKind, quantity: Yield,
): ProduceInventory {
  const normalized = normalizeYield(quantity);
  if (compareYield(normalized, makeYield(0)) < 0) {
    throw new RangeError("Produce quantity cannot be negative");
  }
  return { ...inventory, [kind]: addYield(inventory[kind], normalized) };
}
