import { COCONUT_CARD, FRUIT_CARD, RUBBER_CARD } from "./long-term-crop-data";
import type { CropKind } from "./crop-types";
import type { Land } from "../land/land-types";
import type { Currency } from "../types";
import { CASH_CROP_CARDS } from "./cash-crop-data";

type CropDefinition<K extends CropKind> = {
    kind: K;
    name: string;
    emoji: string;
    purchaseLabel: string;
    purchaseCost: Currency;
    getPlacementBlockReason: (land: Land) => string | null;
};

export const CROP_DEFINITIONS = {
    rubber: {
        kind: "rubber", name: "Rubber", emoji: "🌳", purchaseLabel: "Seedling",
        purchaseCost: RUBBER_CARD.seedlingCost,
        getPlacementBlockReason: () => null,
    },
    fruit: {
        kind: "fruit", name: "Fruit", emoji: "🍎", purchaseLabel: "Seedlings",
        purchaseCost: FRUIT_CARD.seedlingCost,
        getPlacementBlockReason: () => null,
    },
    coconut: {
        kind: "coconut", name: "Coconut", emoji: "🥥", purchaseLabel: "Seedling",
        purchaseCost: COCONUT_CARD.seedlingCost,
        getPlacementBlockReason: () => null,
    },
    rice: {
        kind: "rice", name: "Rice", emoji: "🌾", purchaseLabel: "Seeds",
        purchaseCost: CASH_CROP_CARDS.rice.seedCost,
        getPlacementBlockReason: (land: Land) => !land.isCleared
            ? "Clearing is required before planting rice."
            : land.category !== "plains"
                ? "Rice requires cleared lowland."
                : null,
    },
    corn: {
        kind: "corn", name: "Corn", emoji: "🌽", purchaseLabel: "Seeds",
        purchaseCost: CASH_CROP_CARDS.corn.seedCost,
        getPlacementBlockReason: (land: Land) => !land.isCleared
            ? "Clearing is required before planting corn."
            : null,
    },
} as const satisfies { [K in CropKind]: CropDefinition<K> };

export const IMPLEMENTED_CROPS = Object.values(CROP_DEFINITIONS);
