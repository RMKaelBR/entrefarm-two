import { CLEARING_COST_GOLD, IRRIGATION_COST_GOLD, LAND_CATEGORY_DEFINITIONS, LAND_PRESETS } from "./land-data";
import { addCurrency } from "../money/calculate-money";
import type { Currency } from "../types";
import type { Elevation, Land, LandOrigin, PlainsLand } from "./land-types";

export function createLand(origin: LandOrigin): Land {
    const id = crypto.randomUUID();
    switch (origin) {
        case "foothills":
            return {
                id,
                origin,
                ...LAND_PRESETS.foothills.initialState,
                currentValue: { ...LAND_PRESETS.foothills.initialState.currentValue },
            };
        case "forestedPlains":
            return {
                id,
                origin,
                ...LAND_PRESETS.forestedPlains.initialState,
                currentValue: { ...LAND_PRESETS.forestedPlains.initialState.currentValue },
            };
        case "plains":
            return {
                id,
                origin,
                ...LAND_PRESETS.plains.initialState,
                currentValue: { ...LAND_PRESETS.plains.initialState.currentValue },
            };
        case "riverlands":
            return {
                id,
                origin,
                ...LAND_PRESETS.riverlands.initialState,
                currentValue: { ...LAND_PRESETS.riverlands.initialState.currentValue },
            };
    }
}

type UnclearedPlainsLand = Extract<
    PlainsLand,
    { isCleared: false; isIrrigated: false }
>;

type IrrigablePlainsLand = Extract<
    PlainsLand,
    { isCleared: true; isIrrigated: false }
>;

export function canClearLand(land: Land): land is UnclearedPlainsLand {
    return land.category === "plains" && land.isCleared === false;
}

export function canIrrigateLand(land: Land): land is IrrigablePlainsLand {
    return land.category === "plains"
        && land.isCleared === true
        && land.isIrrigated === false;
}

export function clearLand(land: Land): Land {
    if (!canClearLand(land)) return land;

    return {
        ...land,
        isCleared: true,
        currentValue: addCurrency(land.currentValue, CLEARING_COST_GOLD),
    };
}

export function irrigateLand(land: Land): Land {
    if (!canIrrigateLand(land)) return land;
    
    return {
        ...land,
        isIrrigated: true,
        currentValue: addCurrency(land.currentValue, IRRIGATION_COST_GOLD),
    };
}

export const getLandElevation = (land: Land): Elevation =>
    LAND_CATEGORY_DEFINITIONS[land.category].elevation;

export const getConstructionCostMultiplier = (land: Land): number =>
    LAND_CATEGORY_DEFINITIONS[land.category].constructionCostMultiplier;

export function withLandCurrentValue(
    land: Land,
    currentValue: Currency,
): Land {
    return { ...land, currentValue: { ...currentValue } };
}
