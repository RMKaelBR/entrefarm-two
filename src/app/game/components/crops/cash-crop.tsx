"use client";

import { CROP_DEFINITIONS } from "@/game-data/crop/crop-definitions";
import { CROP_CARDS } from "@/game-data/crop/crop-data";
import {
    getCashCropStage,
    getCropYield,
    hasWholeGold,
    isCashCropDeveloped,
    isCashCropMature,
    isCropProductionPaid,
} from "@/game-data/crop/crop-functions";
import type {
    CropDevelopmentTask,
    CashCrop,
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

export function CashCropComponent({ crop }: { crop: CashCrop }) {
    const config = CROP_UI_CONFIG[crop.kind];
    const definition = CROP_DEFINITIONS[crop.kind];
    const card = CROP_CARDS[crop.kind];
    const wallet = useGameStore((state) => state.wallet);
    const fundCropDevelopment = useGameStore((state) => state.fundCropDevelopment);
    const fundCropMaintenance = useGameStore((state) => state.fundCropMaintenance);
    const fundCropProduction = useGameStore((state) => state.fundCropProduction);
    const harvestCrop = useGameStore((state) => state.harvestCrop);

    const phase = getCashCropStage(crop);
    const productionTasks = getProductionTaskViews(crop);

    const hasUnaffordableTask = (
        (phase === "preparation" && developmentTasks.some(({ task }) =>
            !crop.development[task] && !hasWholeGold(wallet, card.developmentCosts[task])))
        || (phase === "maintenance" && crop.maintenancePaid < card.maintenanceSpaces
            && !hasWholeGold(wallet, card.maintenanceSpaceCost))
        || (phase === "harvest" && productionTasks.some(({ paid, cost }) =>
            !paid && !hasWholeGold(wallet, cost)))
    );

    return (
        <section className="space-y-3 border bg-white p-4">
            <h3 className="font-semibold">Active {definition.name} Crop</h3>

            {config.showAffordabilityWarning && hasUnaffordableTask && (
                <p className="text-sm text-amber-700">Not enough whole gold in your wallet for the disabled tasks.</p>
            )}

            <div className="space-y-3 border p-3">
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

                {crop.kind === "rice" && (
                    <div className="space-y-1 text-sm text-stone-600">
                        {crop.irrigationBonus === null ? (
                            <p>
                                Irrigation bonus pending. Irrigate before preparation finishes
                                to secure one extra token for this planting.
                            </p>
                        ) : (
                            <>
                                <p>{crop.irrigationBonus
                                    ? "Irrigation bonus secured: +1 token."
                                    : "No irrigation bonus for this planting."}</p>
                                <p>
                                    Incomplete maintenance: {getCropYield({ ...crop, maintenancePaid: 0 })}
                                    {" tokens. Full maintenance: "}
                                    {getCropYield({ ...crop, maintenancePaid: card.maintenanceSpaces })}
                                    {" tokens."}
                                </p>
                                <p>Later irrigation changes apply to a future planting.</p>
                            </>
                        )}
                    </div>
                )}

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
                                label={`Harvest ${definition.name}`}
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
        </section>
    );
}
