import { CASH_CROP_CARDS } from "@/game-data/crop/cash-crop-data";
import type { CashCrop, CashCropKind, RiceProductionTask, CornProductionTask } from "@/game-data/crop/crop-types";

type CropUiConfig = {
    showAffordabilityWarning: boolean;
    maintenanceMessage: string;
};

export const CROP_UI_CONFIG = {
    rice: {
        showAffordabilityWarning: false,
        maintenanceMessage: "Maintenance is optional. Full maintenance adds two units to the base yield; the recorded irrigation bonus still applies.",
    },
    corn: {
        showAffordabilityWarning: true,
        maintenanceMessage: "Maintenance is optional. Full maintenance yields six units; otherwise harvest yields four.",
    },
} satisfies Record<CashCropKind, CropUiConfig>;

const productionLabels = {
    harvesting: "Harvesting",
    picking: "Picking",
    shelling: "Shelling",
    hauling: "Hauling",
    drying: "Drying",
} satisfies Record<RiceProductionTask | CornProductionTask, string>;

const productionTasks = {
    rice: ["harvesting", "hauling", "drying"],
    corn: ["picking", "shelling", "hauling", "drying"],
} as const satisfies {
    [K in CashCropKind]: readonly (keyof Extract<CashCrop, { kind: K }>["production"])[];
};

// Normalize the discriminated crop types for the shared renderer without casts.
export function getProductionTaskViews(crop: CashCrop) {
    switch (crop.kind) {
        case "rice":
            return productionTasks.rice.map((task) => ({
                task, label: productionLabels[task],
                cost: CASH_CROP_CARDS.rice.productionCosts[task], paid: crop.production[task],
            }));
        case "corn":
            return productionTasks.corn.map((task) => ({
                task, label: productionLabels[task],
                cost: CASH_CROP_CARDS.corn.productionCosts[task], paid: crop.production[task],
            }));
        default: {
            const unhandled: never = crop;
            throw new Error(`Unhandled crop: ${String(unhandled)}`);
        }
    }
}
