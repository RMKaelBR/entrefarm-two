"use client";

import {
    CLEARING_COST_GOLD,
    IRRIGATION_COST_GOLD,
    LAND_PRESETS,
} from "@/game-data/land/land-data";
import {
    canClearLand,
    canIrrigateLand,
    getConstructionCostMultiplier,
    getLandElevation,
} from "@/game-data/land/land-functions";
import { subCurrency } from "@/game-data/money/calculate-money";
import type { Currency } from "@/game-data/types";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

const canAfford = (wallet: Currency, cost: Currency) => {
    const remaining = subCurrency(wallet, cost);
    return remaining.gold >= 0 && remaining.silver >= 0;
};

export const LandComponent = () => {
    const lands = useGameStore((state) => state.lands);
    const wallet = useGameStore((state) => state.wallet);
    const clearOwnedLand = useGameStore((state) => state.clearOwnedLand);
    const irrigateOwnedLand = useGameStore((state) => state.irrigateOwnedLand);

    return (
        <section className="space-y-3">
            <h2 className="font-semibold">Owned Land</h2>
            <div className="flex gap-2">
                {lands.map((land) => {
                    const clearable = canClearLand(land);
                    const irrigatable = canIrrigateLand(land);
                    const clearAffordable = canAfford(wallet, CLEARING_COST_GOLD);
                    const irrigationAffordable = canAfford(wallet, IRRIGATION_COST_GOLD);

                    return (
                        <article key={land.id} className="space-y-3 rounded border bg-white p-4">
                            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                                <dt>Parcel</dt>
                                <dd>
                                    <span aria-hidden="true">
                                        {LAND_PRESETS[land.origin].emoji}
                                    </span>{" "}
                                    {LAND_PRESETS[land.origin].label}
                                </dd>
                                <dt>Elevation</dt>
                                <dd>{getLandElevation(land)}</dd>
                                <dt>Current value</dt>
                                <dd>{land.currentValue.gold} gold {land.currentValue.silver} silver</dd>
                                <dt>Cleared</dt>
                                <dd>{land.isCleared ? "Yes" : "No"}</dd>
                                <dt>Irrigated</dt>
                                <dd>{land.isIrrigated ? "Yes" : "No"}</dd>
                                <dt>Construction cost</dt>
                                <dd>{getConstructionCostMultiplier(land)}x</dd>
                            </dl>

                            {clearable && (
                                <div className="space-y-1">
                                    <Button
                                        disabled={!clearAffordable}
                                        label={clearAffordable
                                            ? `Clear for ${CLEARING_COST_GOLD.gold} Gold`
                                            : `Need ${CLEARING_COST_GOLD.gold} Gold to Clear`}
                                        onClick={() => clearOwnedLand(land.id)}
                                    />
                                    {!clearAffordable && (
                                        <p className="text-sm text-red-700">
                                            Not enough gold to clear this parcel.
                                        </p>
                                    )}
                                </div>
                            )}
                            {irrigatable && (
                                <div className="space-y-1">
                                    <Button
                                        disabled={!irrigationAffordable}
                                        label={irrigationAffordable
                                            ? `Irrigate for ${IRRIGATION_COST_GOLD.gold} Gold`
                                            : `Need ${IRRIGATION_COST_GOLD.gold} Gold to Irrigate`}
                                        onClick={() => irrigateOwnedLand(land.id)}
                                    />
                                    {!irrigationAffordable && (
                                        <p className="text-sm text-red-700">
                                            Not enough gold to irrigate this parcel.
                                        </p>
                                    )}
                                </div>
                            )}
                            {land.isIrrigated && (
                                <p className="text-sm text-emerald-700">
                                    Land development complete.
                                </p>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
};
