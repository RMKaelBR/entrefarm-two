"use client";

import { RICE_CARD } from "@/game-data/crop/crop-data";
import {
    getRiceStage,
    isEligibleRiceRiverland,
    hasWholeGold,
    isRiceDeveloped,
    isRiceMature,
    isRiceProductionPaid,
} from "@/game-data/crop/crop-functions";
import type {
    RiceDevelopmentTask,
    RiceProductionTask,
} from "@/game-data/crop/crop-types";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

const developmentTasks: Array<{
    task: RiceDevelopmentTask;
    label: string;
}> = [
    { task: "plowing", label: "Plowing" },
    { task: "planting", label: "Planting" },
];

const productionTasks: Array<{
    task: RiceProductionTask;
    label: string;
}> = [
    { task: "harvesting", label: "Harvesting" },
    { task: "hauling", label: "Hauling" },
    { task: "drying", label: "Drying" },
];

const stageLabels = {
    preparation: "Preparation — growth has not started",
    planting: "Planting — month 1 / 3",
    maintenance: "Maintenance — month 2 / 3",
    harvest: "Harvest-ready — month 3 / 3",
};

export function RiceCropComponent() {
    const wallet = useGameStore((state) => state.wallet);
    const lands = useGameStore((state) => state.lands);
    const crops = useGameStore((state) => state.crops);
    const inventory = useGameStore((state) => state.produceInventory);
    const startRicePlanting = useGameStore((state) => state.startRicePlanting);
    const fundRiceDevelopment = useGameStore((state) => state.fundRiceDevelopment);
    const fundRiceMaintenance = useGameStore((state) => state.fundRiceMaintenance);
    const fundRiceProduction = useGameStore((state) => state.fundRiceProduction);
    const harvestRice = useGameStore((state) => state.harvestRice);

    const riverland = lands.find((land) => land.origin === "riverlands");
    const crop = crops.find((item) => item.landId === riverland?.id);
    const phase = crop ? getRiceStage(crop) : null;
    const heldRice = inventory.filter((item) => item.crop === "rice").length;
    const emptyParcelStatus = !riverland
        ? "No owned riverland is available."
        : !isEligibleRiceRiverland(riverland)
            ? "Rice requires cleared, irrigated riverland."
            : !hasWholeGold(wallet, RICE_CARD.seedCost)
                ? "One whole gold is required to purchase seed."
                : null;

    return (
        <section className="space-y-3 border bg-white p-4">
            <h2 className="font-semibold">Irrigated Rice</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt>Held rice</dt>
                <dd>{heldRice} tokens</dd>
            </dl>

            {!crop && riverland && (
                <div className="space-y-2">
                    <Button
                        label={`Start Rice Planting (${RICE_CARD.seedCost.gold} Gold)`}
                        disabled={Boolean(emptyParcelStatus)}
                        onClick={() => startRicePlanting(riverland.id)}
                    />
                    {emptyParcelStatus && (
                        <p className="text-sm text-stone-600">{emptyParcelStatus}</p>
                    )}
                </div>
            )}

            {!riverland && (
                <p className="text-sm text-stone-600">{emptyParcelStatus}</p>
            )}

            {crop && (
                <div className="space-y-3 border p-3">
                    <h3 className="font-medium">Active Rice Crop</h3>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                        <dt>Stage</dt>
                        <dd>{stageLabels[getRiceStage(crop)]}</dd>
                        <dt>Seed</dt>
                        <dd>Paid</dd>
                        <dt>Plowing</dt>
                        <dd>{crop.development.plowing ? "Paid" : "Unpaid"}</dd>
                        <dt>Planting</dt>
                        <dd>{crop.development.planting ? "Paid" : "Unpaid"}</dd>
                        <dt>Maintenance</dt>
                        <dd>{crop.maintenancePaid} / {RICE_CARD.maintenanceSpaces}</dd>
                        <dt>Maturity</dt>
                        <dd>{crop.maturity.timeTokens} / {crop.maturity.timeTokensMax}</dd>
                        {productionTasks.map(({ task, label }) => (
                            <div className="contents" key={task}>
                                <dt>{label}</dt>
                                <dd>{crop.production[task] ? "Paid" : "Unpaid"}</dd>
                            </div>
                        ))}
                    </dl>

                    {(phase === "preparation" || phase === "planting") && (
                        <div className="flex flex-wrap gap-2">
                            {developmentTasks.map(({ task, label }) => {
                                if (crop.development[task]) return null;
                                const cost = RICE_CARD.developmentCosts[task];
                                return (
                                    <Button
                                        key={task}
                                        label={`Fund ${label} (${cost.gold} Gold)`}
                                        disabled={!hasWholeGold(wallet, cost)}
                                        onClick={() => fundRiceDevelopment(crop.id, task)}
                                    />
                                );
                            })}
                            {isRiceDeveloped(crop) && (
                                <p className="text-sm text-emerald-700">
                                    Preparation is complete. Maintenance opens next month.
                                </p>
                            )}
                        </div>
                    )}

                    {phase === "maintenance" && (
                        <div className="space-y-2">
                            {crop.maintenancePaid < RICE_CARD.maintenanceSpaces && (
                                <Button
                                    label={`Fund Maintenance (${RICE_CARD.maintenanceSpaceCost.gold} Gold)`}
                                    disabled={!hasWholeGold(wallet, RICE_CARD.maintenanceSpaceCost)}
                                    onClick={() => fundRiceMaintenance(crop.id)}
                                />
                            )}
                            <p className="text-sm text-stone-600">
                                Maintenance is optional. A fully developed crop gains maturity when this month ends.
                            </p>
                        </div>
                    )}

                    {isRiceMature(crop) && (
                        <p className="text-sm text-stone-600">
                            Ready until harvested. This crop continues to occupy its parcel.
                        </p>
                    )}

                    {isRiceMature(crop) && (
                        <div className="flex flex-wrap gap-2">
                            {productionTasks.map(({ task, label }) => {
                                if (crop.production[task]) return null;
                                const cost = RICE_CARD.productionCosts[task];
                                return (
                                    <Button
                                        key={task}
                                        label={`Fund ${label} (${cost.gold} Gold)`}
                                        disabled={!hasWholeGold(wallet, cost)}
                                        onClick={() => fundRiceProduction(crop.id, task)}
                                    />
                                );
                            })}
                            {isRiceProductionPaid(crop) && (
                                <Button
                                    label="Harvest Rice"
                                    onClick={() => harvestRice(crop.id)}
                                />
                            )}
                        </div>
                    )}

                    {!isRiceDeveloped(crop) && (
                        <p className="text-sm text-amber-700">
                            Complete preparation in any month to start this crop’s three-month cycle.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
