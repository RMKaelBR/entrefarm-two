"use client";

import { CORN_CARD } from "@/game-data/crop/crop-data";
import {
    getAssignedCornLand,
    getCashCropStage,
    isEligibleCornLand,
    hasWholeGold,
    isCashCropDeveloped,
    isCashCropMature,
    isCornProductionPaid,
} from "@/game-data/crop/crop-functions";
import type {
    CornDevelopmentTask,
    CornProductionTask,
} from "@/game-data/crop/crop-types";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

const developmentTasks: Array<{
    task: CornDevelopmentTask;
    label: string;
}> = [
    { task: "plowing", label: "Plowing" },
    { task: "planting", label: "Planting" },
];

const productionTasks: Array<{
    task: CornProductionTask;
    label: string;
}> = [
    { task: "picking", label: "Picking" },
    { task: "shelling", label: "Shelling" },
    { task: "hauling", label: "Hauling" },
    { task: "drying", label: "Drying" },
];

const stageLabels = {
    preparation: "Preparation — growth has not started",
    planting: "Planting — month 1 / 3",
    maintenance: "Maintenance — month 2 / 3",
    harvest: "Harvest-ready — month 3 / 3",
};

export function CornCropComponent() {
    const wallet = useGameStore((state) => state.wallet);
    const lands = useGameStore((state) => state.lands);
    const crops = useGameStore((state) => state.crops);
    const inventory = useGameStore((state) => state.produceInventory);
    const startCornPlanting = useGameStore((state) => state.startCornPlanting);
    const fundCornDevelopment = useGameStore((state) => state.fundCornDevelopment);
    const fundCornMaintenance = useGameStore((state) => state.fundCornMaintenance);
    const fundCornProduction = useGameStore((state) => state.fundCornProduction);
    const harvestCorn = useGameStore((state) => state.harvestCorn);

    const plains = getAssignedCornLand(lands);
    const occupant = crops.find((item) => item.landId === plains?.id);
    const crop = occupant?.kind === "corn" ? occupant : undefined;
    const phase = crop ? getCashCropStage(crop) : null;
    const heldCorn = inventory.filter((item) => item.crop === "corn").length;
    const emptyParcelStatus = !plains
        ? "No owned Plains parcel is available."
        : occupant
            ? "This parcel is already occupied."
        : !isEligibleCornLand(plains)
            ? "Clearing is required before planting corn."
            : !hasWholeGold(wallet, CORN_CARD.seedCost)
                ? "One whole gold is required to purchase seed."
                : null;

    const hasUnaffordableTask = crop && (
        (phase === "preparation" && developmentTasks.some(({ task }) =>
            !crop.development[task] && !hasWholeGold(wallet, CORN_CARD.developmentCosts[task])))
        || (phase === "maintenance" && crop.maintenancePaid < CORN_CARD.maintenanceSpaces
            && !hasWholeGold(wallet, CORN_CARD.maintenanceSpaceCost))
        || (phase === "harvest" && productionTasks.some(({ task }) =>
            !crop.production[task] && !hasWholeGold(wallet, CORN_CARD.productionCosts[task])))
    );

    return (
        <section className="space-y-3 border bg-white p-4">
            <h2 className="font-semibold">Corn</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt>Assigned parcel</dt>
                <dd>{plains ? `Plains (${plains.id})` : "Unavailable"}</dd>
                <dt>Held corn</dt>
                <dd>{heldCorn} tokens</dd>
            </dl>

            {!crop && plains && (
                <div className="space-y-2">
                    <Button
                        label={`Start Corn Planting (${CORN_CARD.seedCost.gold} Gold)`}
                        disabled={Boolean(emptyParcelStatus)}
                        onClick={() => startCornPlanting(plains.id)}
                    />
                    {emptyParcelStatus && (
                        <p className="text-sm text-stone-600">{emptyParcelStatus}</p>
                    )}
                </div>
            )}

            {!plains && (
                <p className="text-sm text-stone-600">{emptyParcelStatus}</p>
            )}

            {hasUnaffordableTask && (
                <p className="text-sm text-amber-700">Not enough whole gold in your wallet for the disabled tasks.</p>
            )}

            {crop && (
                <div className="space-y-3 border p-3">
                    <h3 className="font-medium">Active Corn Crop</h3>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                        <dt>Stage</dt>
                        <dd>{stageLabels[getCashCropStage(crop)]}</dd>
                        <dt>Seed</dt>
                        <dd>Paid</dd>
                        <dt>Plowing</dt>
                        <dd>{crop.development.plowing ? "Paid" : "Unpaid"}</dd>
                        <dt>Planting</dt>
                        <dd>{crop.development.planting ? "Paid" : "Unpaid"}</dd>
                        <dt>Maintenance</dt>
                        <dd>{crop.maintenancePaid} / {CORN_CARD.maintenanceSpaces}</dd>
                        <dt>Growth progress</dt>
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
                                const cost = CORN_CARD.developmentCosts[task];
                                return (
                                    <Button
                                        key={task}
                                        label={`Fund ${label} (${cost.gold} Gold)`}
                                        disabled={!hasWholeGold(wallet, cost)}
                                        onClick={() => fundCornDevelopment(crop.id, task)}
                                    />
                                );
                            })}
                            {isCashCropDeveloped(crop) && (
                                <p className="text-sm text-emerald-700">
                                    Preparation is complete. Maintenance opens next month.
                                </p>
                            )}
                        </div>
                    )}

                    {phase === "maintenance" && (
                        <div className="space-y-2">
                            {crop.maintenancePaid < CORN_CARD.maintenanceSpaces && (
                                <Button
                                    label={`Fund Maintenance (${CORN_CARD.maintenanceSpaceCost.gold} Gold)`}
                                    disabled={!hasWholeGold(wallet, CORN_CARD.maintenanceSpaceCost)}
                                    onClick={() => fundCornMaintenance(crop.id)}
                                />
                            )}
                            <p className="text-sm text-stone-600">
                                Maintenance is optional. Full maintenance yields six tokens; otherwise harvest yields four.
                            </p>
                        </div>
                    )}

                    {isCashCropMature(crop) && (
                        <p className="text-sm text-stone-600">
                            Ready until harvested. This crop continues to occupy its parcel.
                        </p>
                    )}

                    {isCashCropMature(crop) && (
                        <div className="flex flex-wrap gap-2">
                            {productionTasks.map(({ task, label }) => {
                                if (crop.production[task]) return null;
                                const cost = CORN_CARD.productionCosts[task];
                                return (
                                    <Button
                                        key={task}
                                        label={`Fund ${label} (${cost.gold} Gold)`}
                                        disabled={!hasWholeGold(wallet, cost)}
                                        onClick={() => fundCornProduction(crop.id, task)}
                                    />
                                );
                            })}
                            {isCornProductionPaid(crop) && (
                                <Button
                                    label="Harvest Corn"
                                    onClick={() => harvestCorn(crop.id)}
                                />
                            )}
                        </div>
                    )}

                    {!isCashCropDeveloped(crop) && (
                        <p className="text-sm text-amber-700">
                            Complete preparation in any month to start this crop’s three-month cycle.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
