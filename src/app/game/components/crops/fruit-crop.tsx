"use client";

import { CROP_DEFINITIONS } from "@/game-data/crop/crop-definitions";

import { FRUIT_CARD as card } from "@/game-data/crop/long-term-crop-data";
import { canCollectFruit, fruitBonusChance, fruitHighChance, fruitPeriodMonth, fruitYield, prepareFruitMaintenance, prepareFruitFullMaintenance, fruitYoungPoints } from "@/game-data/crop/fruit-functions";
import { developmentProgress, maintenanceWeightTotal } from "@/game-data/crop/long-term-crop-functions";
import { hasWholeGold } from "@/game-data/crop/crop-functions";
import type { FruitCrop } from "@/game-data/crop/crop-types";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

const developmentTasks = ["siteClearing", "seedlingHauling", "planting"] as const;
const productionTasks = ["harvesting", "hauling"] as const;
const labels = { siteClearing: "Site clearing", seedlingHauling: "Seedling hauling", planting: "Planting" };
const percentage = (chance: number) => `${Number((chance * 100).toFixed(2))}%`;

export function FruitCropComponent({ crop }: { crop: FruitCrop }) {
    const wallet = useGameStore((s) => s.wallet);
    const develop = useGameStore((s) => s.fundCropDevelopment);
    const maintain = useGameStore((s) => s.fundCropMaintenance);
    const produce = useGameStore((s) => s.fundCropProduction);
    const collect = useGameStore((s) => s.harvestCrop);
    const fundAllMaintenance = useGameStore((s) => s.fundAllFruitMaintenance);
    const fullMaintenance = prepareFruitFullMaintenance(crop);
    const affordable = hasWholeGold(wallet, card.maintenanceCost);
    const life = crop.lifecycle;
    return <section className="space-y-3 border bg-white p-4">
        <h3 className="font-semibold"><span aria-hidden="true">{CROP_DEFINITIONS.fruit.emoji}</span> Active Fruit Crop</h3>
        {!affordable && <p className="text-sm text-amber-700">Not enough whole gold for unpaid expenses.</p>}
        {life.phase === "development" ? <>
            <p>Development · Seedling paid</p>
            <p>Complete all three expenses to begin young month 1. Site clearing does not clear the land parcel.</p>
            {developmentTasks.map((task) => <div key={task}>
                <p>{labels[task]}: {life.development[task] ? "Paid" : "Unpaid"}</p>
                <Button label={`Fund ${labels[task]} (${card.developmentCosts[task].gold} Gold)`}
                    disabled={life.development[task] || !hasWholeGold(wallet, card.developmentCosts[task])}
                    onClick={() => develop(crop.id, task)} />
            </div>)}
        </> : <>
            {life.phase === "young" ? <>
                <p>Young · Crop month {life.cropMonth} · Period month {fruitPeriodMonth(life.cropMonth)} / {card.developmentMaintenancePeriodMonths}</p>
                <p>Development growth: {developmentProgress(life, card.developmentTokens)} / {card.developmentTokens} ({life.regularTokens} regular + {life.bonusTokens} bonus)</p>
                <p>Development maintenance: {life.payments.length} / {card.developmentMaintenanceSlots} · Points: {maintenanceWeightTotal(life.payments) / 100} · Bonus chance: {percentage(fruitBonusChance(life))}</p>
                <p>Each payment now adds {fruitYoungPoints(life.cropMonth) / 100} points. Earlier payments keep their value.</p>
                <p>Regular growth arrives every third crop month. The bonus resolves after period month 6 ends, then slots reset.</p>
            </> : <>
                <p>Adult · {life.stage === "resting" ? "Between cycles" : `Cycle month ${life.cycleMonth}`} · Production growth: {life.progress} / {card.productionTokens}</p>
                {life.lastHarvest && <p role="status">Last harvest: {life.lastHarvest.outcome} · {life.lastHarvest.quantity} produce tokens.</p>}
                <p>Production maintenance: {life.payments.length} / {card.productionMaintenanceSlots} · High-yield chance: {percentage(fruitHighChance(life))}</p>
                {life.stage === "resting" ? <p>This harvest cycle has ended. The next successful monthly advance starts month 1 of the next cycle.</p> : <>
                    {life.stage === "growing" && <p>Normally ready in cycle month {card.productionCycleMonths}. Surplus development growth can shorten this cycle.</p>}
                    {life.stage === "ready" && <>
                        <p>{life.readyAge === 0 ? "Harvest-ready" : "Overripe"} · Stored result: {life.yieldResult} · Available yield: {fruitYield(life)} tokens</p>
                        <p>{2 - life.readyAge} successful monthly advances before total loss.</p>
                        {productionTasks.map((task) => <div key={task}>
                            <p>{task === "harvesting" ? "Harvesting" : "Hauling"}: {life.production[task] ? "Paid" : "Unpaid — required"}</p>
                            <Button label={`Fund ${task === "harvesting" ? "Harvesting" : "Hauling"} (${card.productionCosts[task].gold} Gold)`}
                                disabled={life.production[task] || !hasWholeGold(wallet, card.productionCosts[task])}
                                onClick={() => produce(crop.id, task)} />
                        </div>)}
                        <p>Both production expenses are required, including while overripe.</p>
                        <Button label={`Collect Fruit (${fruitYield(life)} tokens)`} disabled={!canCollectFruit(life)} onClick={() => collect(crop.id)} />
                    </>}
                </>}
            </>}
            {(life.phase === "young" || life.stage === "growing") && <>
                <Button label={`Fund ${life.phase === "young" ? "development" : "production"} maintenance (${card.maintenanceCost.gold} Gold)`}
                    disabled={!prepareFruitMaintenance(crop) || !hasWholeGold(wallet, card.maintenanceCost)}
                    onClick={() => maintain(crop.id)} />
                <Button label={`Fund all maintenance (${fullMaintenance?.cost.gold ?? 0} Gold)`}
                    className="ml-2"
                    disabled={!fullMaintenance || !hasWholeGold(wallet, fullMaintenance.cost)}
                    onClick={() => fundAllMaintenance(crop.id)} />
            </>}
        </>}
    </section>;
}
