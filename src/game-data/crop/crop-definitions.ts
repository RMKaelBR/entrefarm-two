import type { CropKind } from "./crop-types";
import type { Land } from "../land/land-types";
import type { Currency } from "../types";
import { CROP_CARDS } from "./crop-data";

type CropDefinition<K extends CropKind> = {
    kind: K;
    name: string;
    purchaseLabel: string;
    purchaseCost: Currency;
    getPlacementBlockReason: (land: Land) => string | null;
};

export const CROP_DEFINITIONS = {
    rice: {
        kind: "rice", name: "Rice", purchaseLabel: "Seeds",
        purchaseCost: CROP_CARDS.rice.seedCost,
        getPlacementBlockReason: (land: Land) => !land.isCleared
            ? "Clearing is required before planting rice."
            : land.category !== "plains"
                ? "Rice requires cleared lowland."
                : null,
    },
    corn: {
        kind: "corn", name: "Corn", purchaseLabel: "Seeds",
        purchaseCost: CROP_CARDS.corn.seedCost,
        getPlacementBlockReason: (land: Land) => !land.isCleared
            ? "Clearing is required before planting corn."
            : null,
    },
} as const satisfies { [K in CropKind]: CropDefinition<K> };

export const IMPLEMENTED_CROPS = Object.values(CROP_DEFINITIONS);
