import { describe, expect, it } from "vitest";

import {
    CLEARING_COST_GOLD,
    IRRIGATION_COST_GOLD,
} from "./land-data";
import {
    canClearLand,
    canIrrigateLand,
    clearLand,
    createLand,
    getConstructionCostMultiplier,
    getLandElevation,
    irrigateLand,
    withLandCurrentValue,
} from "./land-functions";
import type { LandOrigin } from "./land-types";

const gold = (amount: number, silver = 0) => ({ gold: amount, silver });

describe("createLand", () => {
    it.each([
        ["foothills", "foothills", true, false, 30],
        ["forestedPlains", "plains", false, false, 30],
        ["plains", "plains", true, false, 40],
        ["riverlands", "plains", true, true, 50],
    ] as const)(
        "creates the %s preset",
        (origin, category, isCleared, isIrrigated, currentValue) => {
            expect(createLand(origin)).toEqual({
                origin,
                category,
                isCleared,
                isIrrigated,
                currentValue: gold(currentValue),
            });
        },
    );

    it("returns independent parcel values", () => {
        const first = createLand("plains");
        const second = createLand("plains");

        expect(first).not.toBe(second);
        expect(first.currentValue).not.toBe(second.currentValue);
    });
});

describe("land development", () => {
    it("clears then irrigates Forested Plains without losing its identity", () => {
        const forested = createLand("forestedPlains");
        const cleared = clearLand(forested);
        const irrigated = irrigateLand(cleared);

        expect(cleared).toEqual({
            origin: "forestedPlains",
            category: "plains",
            isCleared: true,
            isIrrigated: false,
            currentValue: gold(40),
        });
        expect(irrigated).toEqual({
            origin: "forestedPlains",
            category: "plains",
            isCleared: true,
            isIrrigated: true,
            currentValue: gold(50),
        });
        expect(forested.currentValue).toEqual(gold(30));
        expect(cleared).not.toBe(forested);
        expect(irrigated).not.toBe(cleared);
    });

    it("uses Currency arithmetic for adjusted values", () => {
        const adjusted = withLandCurrentValue(
            createLand("forestedPlains"),
            gold(31, 5),
        );

        expect(clearLand(adjusted).currentValue).toEqual(gold(41, 5));
    });

    it.each([
        ["foothills", false, false],
        ["forestedPlains", true, false],
        ["plains", false, true],
        ["riverlands", false, false],
    ] as const)(
        "reports eligibility for %s",
        (origin: LandOrigin, canClear, canIrrigate) => {
            const land = createLand(origin);
            expect(canClearLand(land)).toBe(canClear);
            expect(canIrrigateLand(land)).toBe(canIrrigate);
        },
    );

    it("does not change or charge land for invalid and repeated actions", () => {
        const foothills = createLand("foothills");
        const forested = createLand("forestedPlains");
        const riverlands = createLand("riverlands");

        expect(clearLand(foothills)).toBe(foothills);
        expect(irrigateLand(foothills)).toBe(foothills);
        expect(irrigateLand(forested)).toBe(forested);
        expect(irrigateLand(riverlands)).toBe(riverlands);

        const cleared = clearLand(forested);
        expect(clearLand(cleared)).toBe(cleared);
    });
});

describe("land rules", () => {
    it.each([
        ["foothills", "upland", 1.5],
        ["plains", "lowland", 1],
    ] as const)("returns rules for %s", (origin, elevation, multiplier) => {
        const land = createLand(origin);
        expect(getLandElevation(land)).toBe(elevation);
        expect(getConstructionCostMultiplier(land)).toBe(multiplier);
    });

    it("defines both development costs as 10 Gold", () => {
        expect(CLEARING_COST_GOLD).toEqual(gold(10));
        expect(IRRIGATION_COST_GOLD).toEqual(gold(10));
    });
});
