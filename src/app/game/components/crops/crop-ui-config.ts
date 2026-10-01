import { CROP_CARDS } from "@/game-data/crop/crop-data";
import {
    getAssignedCornLand,
    isEligibleCornLand,
    isEligibleRiceLand,
} from "@/game-data/crop/crop-functions";
import type { CashCrop, CropKind, CropProductionTask } from "@/game-data/crop/crop-types";
import type { Land } from "@/game-data/land/land-types";

type CropUiConfig = {
    name: string;
    heading: string;
    selectLand: (lands: Land[]) => Land | undefined;
    isEligibleLand: (land: Land) => boolean;
    unavailableMessage: string;
    ineligibleMessage: string;
    assignedParcelLabel: string | null;
    showAffordabilityWarning: boolean;
    maintenanceMessage: string;
};

export const CROP_UI_CONFIG = {
    rice: {
        name: "Rice",
        heading: "Rice",
        selectLand: (lands) => lands.find((land) => land.origin === "riverlands"),
        isEligibleLand: isEligibleRiceLand,
        unavailableMessage: "No owned riverland is available.",
        ineligibleMessage: "Rice requires cleared lowland.",
        assignedParcelLabel: "Plains",
        showAffordabilityWarning: false,
        maintenanceMessage: "Maintenance is optional. Full maintenance adds two tokens to the base yield; the recorded irrigation bonus still applies.",
    },
    corn: {
        name: "Corn",
        heading: "Corn",
        selectLand: getAssignedCornLand,
        isEligibleLand: isEligibleCornLand,
        unavailableMessage: "No owned Plains parcel is available.",
        ineligibleMessage: "Clearing is required before planting corn.",
        assignedParcelLabel: "Plains",
        showAffordabilityWarning: true,
        maintenanceMessage: "Maintenance is optional. Full maintenance yields six tokens; otherwise harvest yields four.",
    },
} satisfies Record<CropKind, CropUiConfig>;

const productionLabels = {
    harvesting: "Harvesting",
    picking: "Picking",
    shelling: "Shelling",
    hauling: "Hauling",
    drying: "Drying",
} satisfies Record<CropProductionTask, string>;

const productionTasks = {
    rice: ["harvesting", "hauling", "drying"],
    corn: ["picking", "shelling", "hauling", "drying"],
} as const satisfies {
    [K in CropKind]: readonly (keyof Extract<CashCrop, { kind: K }>["production"])[];
};

// Normalize the discriminated crop types for the shared renderer without casts.
export function getProductionTaskViews(crop: CashCrop) {
    switch (crop.kind) {
        case "rice":
            return productionTasks.rice.map((task) => ({
                task, label: productionLabels[task],
                cost: CROP_CARDS.rice.productionCosts[task], paid: crop.production[task],
            }));
        case "corn":
            return productionTasks.corn.map((task) => ({
                task, label: productionLabels[task],
                cost: CROP_CARDS.corn.productionCosts[task], paid: crop.production[task],
            }));
        default: {
            const unhandled: never = crop;
            throw new Error(`Unhandled crop: ${String(unhandled)}`);
        }
    }
}
