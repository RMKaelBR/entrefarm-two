import type { Currency } from "../types";
import type { Elevation, Land, LandCategory, LandOrigin } from "./land-types";

export type LandCategoryDefinition = {
    label: string;
    elevation: Elevation;
    constructionCostMultiplier: number;
}

export const LAND_CATEGORY_DEFINITIONS = {
    foothills: {
        label: "Foothills",
        elevation: "upland",
        constructionCostMultiplier: 1.5,
    },
    plains: {
        label: "Plains",
        elevation: "lowland",
        constructionCostMultiplier: 1,
    },
} as const satisfies Record<LandCategory, LandCategoryDefinition>;

export const CLEARING_COST_GOLD = {
    gold: 10,
    silver: 0,
} as const satisfies Currency;

export const IRRIGATION_COST_GOLD = {
    gold: 10,
    silver: 0,
} as const satisfies Currency;

type LandInitialState = Land extends infer LandVariant
    ? LandVariant extends Land
        ? Omit<LandVariant, "id" | "origin">
        : never
    : never;

type LandPresetTable = Record<LandOrigin, {
    emoji: string;
    label: string;
    initialState: LandInitialState;
}>;

export const LAND_PRESETS = {
    foothills: {
        emoji: "⛰",
        label: "Foothills",
        initialState: {
            category: "foothills",
            isCleared: true,
            isIrrigated: false,
            currentValue: { gold: 30, silver: 0 }
        }
    },
    forestedPlains: {
        emoji: "🌳",
        label: "Forested Plains",
        initialState: {
            category: "plains",
            isCleared: false,
            isIrrigated: false,
            currentValue: { gold: 30, silver: 0 }
        }
    },
    plains: {
        emoji: "☀",
        label: "Plains",
        initialState: {
            category: "plains",
            isCleared: true,
            isIrrigated: false,
            currentValue: { gold: 40, silver: 0 }
        }
    },
    riverlands: {
        emoji: "🌊",
        label: "Riverlands",
        initialState: {
            category: "plains",
            isCleared: true,
            isIrrigated: true,
            currentValue: { gold: 50, silver: 0 }
        }
    }
} as const satisfies LandPresetTable;
