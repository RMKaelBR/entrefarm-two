export const LAND_ORIGINS = [
    "foothills",
    "forestedPlains",
    "plains",
    "riverlands",
] as const;

import type { Currency } from "../types";

export type LandOrigin = (typeof LAND_ORIGINS)[number];
export type LandCategory = "foothills" | "plains";
export type Elevation = "upland" | "lowland";

type LandIdentity = {
    id: string;
    origin: LandOrigin;
    currentValue: Currency;
}

export type FoothillsLand = LandIdentity & {
    origin: "foothills";
    category: "foothills";
    isCleared: true;
    isIrrigated: false;
}

export type PlainsDevelopmentState =
    | { isCleared: false; isIrrigated: false }
    | { isCleared: true; isIrrigated: false }
    | { isCleared: true; isIrrigated: true };

export type PlainsLand = LandIdentity & {
    origin: Exclude<LandOrigin, "foothills">;
    category: "plains";
} & PlainsDevelopmentState;

export type Land = FoothillsLand | PlainsLand;
