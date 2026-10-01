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
import {
    calculateLoanPrincipal,
    findLoanForLand,
} from "@/game-data/loan/loan-functions";
import { canAffordCurrency } from "@/game-data/money/calculate-money";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

export const LandComponent = () => {
    const lands = useGameStore((state) => state.lands);
    const loans = useGameStore((state) => state.loans);
    const wallet = useGameStore((state) => state.wallet);
    const clearOwnedLand = useGameStore((state) => state.clearOwnedLand);
    const irrigateOwnedLand = useGameStore((state) => state.irrigateOwnedLand);
    const takeLandLoan = useGameStore((state) => state.takeLandLoan);
    const repayLoan = useGameStore((state) => state.repayLoan);
    const carryOverLoan = useGameStore((state) => state.carryOverLoan);

    return (
        <section className="space-y-3">
            <h2 className="font-semibold">Owned Land</h2>
            <div className="flex gap-2">
                {lands.map((land) => {
                    const clearable = canClearLand(land);
                    const irrigatable = canIrrigateLand(land);
                    const clearAffordable = canAffordCurrency(wallet, CLEARING_COST_GOLD);
                    const irrigationAffordable = canAffordCurrency(wallet, IRRIGATION_COST_GOLD);
                    const loan = findLoanForLand(loans, land.id);
                    const proceeds = calculateLoanPrincipal(land.currentValue);
                    const canRepay = loan
                        ? canAffordCurrency(wallet, loan.outstandingBalance)
                        : false;

                    return (
                        <article key={land.id} className="space-y-3 rounded border bg-white p-4">
                            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                                <dt>Land ID</dt>
                                <dd>{land.id}</dd>
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

                            {!loan && (
                                <Button
                                    label={`Borrow ${proceeds.gold} Gold ${proceeds.silver} Silver`}
                                    onClick={() => takeLandLoan(land.id)}
                                />
                            )}
                            {loan?.status === "active" && (
                                <p className="text-sm text-amber-700">
                                    Pledged as collateral — outstanding: {loan.outstandingBalance.gold} gold {loan.outstandingBalance.silver} silver.
                                </p>
                            )}
                            {loan?.status === "pending" && (
                                <div className="space-y-2">
                                    <p className="text-sm text-red-700">
                                        Amount due: {loan.outstandingBalance.gold} gold {loan.outstandingBalance.silver} silver.
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            disabled={!canRepay}
                                            label={canRepay ? "Repay Loan" : "Cannot Afford Repayment"}
                                            onClick={() => repayLoan(loan.id)}
                                        />
                                        <Button
                                            label="Carry Over"
                                            onClick={() => carryOverLoan(loan.id)}
                                        />
                                    </div>
                                </div>
                            )}

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
