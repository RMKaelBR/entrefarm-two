"use client";

import { CROP_CARDS } from "@/game-data/crop/crop-data";
import {
    getCashCropStage,
    hasWholeGold,
    isCashCropDeveloped,
    isCashCropMature,
    isCropProductionPaid,
} from "@/game-data/crop/crop-functions";
import type {
    CropDevelopmentTask,
    CropKind,
} from "@/game-data/crop/crop-types";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";
import { CROP_UI_CONFIG, getProductionTaskViews } from "./crop-ui-config";

const developmentTasks: Array<{
    task: CropDevelopmentTask;
    label: string;
}> = [
    { task: "plowing", label: "Plowing" },
    { task: "planting", label: "Planting" },
];

const stageLabels = {
    preparation: "Preparation — growth has not started",
    planting: "Planting — month 1 / 3",
    maintenance: "Maintenance — month 2 / 3",
    harvest: "Harvest-ready — month 3 / 3",
};

export function CashCropComponent({ kind }: { kind: CropKind }) {
    const config = CROP_UI_CONFIG[kind];
    const card = CROP_CARDS[kind];
    const wallet = useGameStore((state) => state.wallet);
    const lands = useGameStore((state) => state.lands);
    const crops = useGameStore((state) => state.crops);
    const inventory = useGameStore((state) => state.produceInventory);
    const startCropPlanting = useGameStore((state) => state.startCropPlanting);
    const fundCropDevelopment = useGameStore((state) => state.fundCropDevelopment);
    const fundCropMaintenance = useGameStore((state) => state.fundCropMaintenance);
    const fundCropProduction = useGameStore((state) => state.fundCropProduction);
    const harvestCrop = useGameStore((state) => state.harvestCrop);

    const land = config.selectLand(lands);
    const occupant = crops.find((item) => item.landId === land?.id);
    const crop = occupant?.kind === kind ? occupant : undefined;
    const phase = crop ? getCashCropStage(crop) : null;
    const heldProduce = inventory.filter((item) => item.crop === kind).length;
    const productionTasks = crop ? getProductionTaskViews(crop) : [];
    const emptyParcelStatus = !land
        ? config.unavailableMessage
        : occupant
            ? "This parcel is already occupied."
        : !config.isEligibleLand(land)
            ? config.ineligibleMessage
            : !hasWholeGold(wallet, card.seedCost)
                ? "One whole gold is required to purchase seed."
                : null;

    const hasUnaffordableTask = crop && (
        (phase === "preparation" && developmentTasks.some(({ task }) =>
            !crop.development[task] && !hasWholeGold(wallet, card.developmentCosts[task])))
        || (phase === "maintenance" && crop.maintenancePaid < card.maintenanceSpaces
            && !hasWholeGold(wallet, card.maintenanceSpaceCost))
        || (phase === "harvest" && productionTasks.some(({ paid, cost }) =>
            !paid && !hasWholeGold(wallet, cost)))
    );

    return (
        <section className="space-y-3 border bg-white p-4">
            <h2 className="font-semibold">{config.heading}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {config.assignedParcelLabel && (
                    <>
                        <dt>Assigned parcel</dt>
                        <dd>{land ? `${config.assignedParcelLabel} (${land.id})` : "Unavailable"}</dd>
                    </>
                )}
                <dt>Held {kind}</dt>
                <dd>{heldProduce} tokens</dd>
            </dl>

            {!crop && land && (
                <div className="space-y-2">
                    <Button
                        label={`Start ${config.name} Planting (${card.seedCost.gold} Gold)`}
                        disabled={Boolean(emptyParcelStatus)}
                        onClick={() => startCropPlanting(kind, land.id)}
                    />
                    {emptyParcelStatus && (
                        <p className="text-sm text-stone-600">{emptyParcelStatus}</p>
                    )}
                </div>
            )}

            {!land && (
                <p className="text-sm text-stone-600">{emptyParcelStatus}</p>
            )}

            {config.showAffordabilityWarning && hasUnaffordableTask && (
                <p className="text-sm text-amber-700">Not enough whole gold in your wallet for the disabled tasks.</p>
            )}

            {crop && (
                <div className="space-y-3 border p-3">
                    <h3 className="font-medium">Active {config.name} Crop</h3>
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
                        <dd>{crop.maintenancePaid} / {card.maintenanceSpaces}</dd>
                        <dt>Growth progress</dt>
                        <dd>{crop.maturity.timeTokens} / {crop.maturity.timeTokensMax}</dd>
                        {productionTasks.map(({ task, label, paid }) => (
                            <div className="contents" key={task}>
                                <dt>{label}</dt>
                                <dd>{paid ? "Paid" : "Unpaid"}</dd>
                            </div>
                        ))}
                    </dl>

                    {(phase === "preparation" || phase === "planting") && (
                        <div className="flex flex-wrap gap-2">
                            {developmentTasks.map(({ task, label }) => {
                                if (crop.development[task]) return null;
                                const cost = card.developmentCosts[task];
                                return (
                                    <Button
                                        key={task}
                                        label={`Fund ${label} (${cost.gold} Gold)`}
                                        disabled={!hasWholeGold(wallet, cost)}
                                        onClick={() => fundCropDevelopment(crop.id, task)}
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
                            {crop.maintenancePaid < card.maintenanceSpaces && (
                                <Button
                                    label={`Fund Maintenance (${card.maintenanceSpaceCost.gold} Gold)`}
                                    disabled={!hasWholeGold(wallet, card.maintenanceSpaceCost)}
                                    onClick={() => fundCropMaintenance(crop.id)}
                                />
                            )}
                            <p className="text-sm text-stone-600">
                                {config.maintenanceMessage}
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
                            {productionTasks.map(({ task, label, paid, cost }) => {
                                if (paid) return null;
                                return (
                                    <Button
                                        key={task}
                                        label={`Fund ${label} (${cost.gold} Gold)`}
                                        disabled={!hasWholeGold(wallet, cost)}
                                        onClick={() => fundCropProduction(crop.id, task)}
                                    />
                                );
                            })}
                            {isCropProductionPaid(crop) && (
                                <Button
                                    label={`Harvest ${config.name}`}
                                    onClick={() => harvestCrop(crop.id)}
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
