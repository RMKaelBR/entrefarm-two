"use client";

import { CROP_DEFINITIONS } from "@/game-data/crop/crop-definitions";

import { FRUIT_CARD as card } from "@/game-data/crop/fruit-data";
import { canCollectFruit, fruitBonusChance, fruitHighChance, fruitPeriodMonth, fruitYield, prepareFruitMaintenance } from "@/game-data/crop/fruit-functions";
import { hasWholeGold } from "@/game-data/crop/crop-functions";
import type { FruitCrop } from "@/game-data/crop/crop-types";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

const developmentTasks = ["siteClearing", "hauling", "planting"] as const;
const productionTasks = ["harvesting", "hauling"] as const;
const labels = { siteClearing: "Site clearing", hauling: "Seedling hauling", planting: "Planting" };
const percentage = (chance: number) => `${(chance * 100).toFixed(2)}%`;

export function FruitCropComponent({ crop }: { crop: FruitCrop }) {
    const wallet = useGameStore((s) => s.wallet);
    const develop = useGameStore((s) => s.fundCropDevelopment);
    const maintain = useGameStore((s) => s.fundCropMaintenance);
    const produce = useGameStore((s) => s.fundCropProduction);
    const collect = useGameStore((s) => s.harvestCrop);
    const life = crop.lifecycle;
    return <section className="space-y-3 border bg-white p-4">
        <h3 className="font-semibold"><span aria-hidden="true">{CROP_DEFINITIONS.fruit.emoji}</span> Active Fruit Crop</h3>
        {life.phase === "preparation" ? <>
            <p>Preparation · Seedlings paid (2 Gold). Young month 1 starts when all tasks are paid.</p>
            <p>Site clearing leaves land clearance unchanged.</p>
            {developmentTasks.map((task) => <Button key={task}
                label={`${labels[task]} (${card.developmentCosts[task].gold} Gold)${life.development[task] ? " — Paid" : ""}`}
                disabled={life.development[task] || !hasWholeGold(wallet, card.developmentCosts[task])}
                onClick={() => develop(crop.id, task)} />)}
        </> : <>
            {life.phase === "young" ? <>
                <p>Young · Crop month {life.cropMonth} · Period month {fruitPeriodMonth(life.cropMonth)}/6</p>
                <p>Growth: {life.regularTokens + life.bonusTokens}/{card.youngTokens} tokens</p>
                <p>Maintenance: {life.payments.length}/{card.youngMaintenanceSlots} paid · {card.youngMaintenanceSlots - life.payments.length} remaining</p>
                <p>Points: {life.payments.reduce((sum, p) => sum + p.pointHundredths, 0) / 100} · Bonus chance: {percentage(fruitBonusChance(life))}</p>
                <p>Regular growth arrives every third month. Bonus resolves after period month 6.</p>
            </> : <>
                {life.lastHarvest && <p>Last harvest: {life.lastHarvest.outcome === "lost" ? "All produce lost; a fresh cycle has started." : `Collected ${life.lastHarvest.quantity} fruit tokens.`}</p>}
                {life.stage === "resting" ? <p>Resting · The next successful monthly advance starts adult month 1.</p> : <>
                    <p>Adult · Cycle month {life.cycleMonth} · Growth: {life.progress}/{card.adultTokens} tokens</p>
                    <p>Maintenance: {life.payments.length}/{card.adultMaintenanceSlots} paid · {card.adultMaintenanceSlots - life.payments.length} remaining · High-yield chance: {percentage(fruitHighChance(life))}</p>
                    {life.stage === "ready" && <>
                        <p>{life.readyAge === 0 ? "Harvest-ready" : "Overripe"} · Stored result: {life.yieldResult} · Available: {fruitYield(life)} fruit tokens</p>
                        <p>{2 - life.readyAge} successful monthly advances before total loss.</p>
                        {productionTasks.map((task) => <Button key={task}
                            label={`${task === "harvesting" ? "Harvesting" : "Hauling"} (${card.productionCosts[task].gold} Gold)${life.production[task] ? " — Paid" : ""}`}
                            disabled={life.production[task] || !hasWholeGold(wallet, card.productionCosts[task])}
                            onClick={() => produce(crop.id, task)} />)}
                        <p>Both production expenses are required, including while overripe.</p>
                        <Button label={`Collect Fruit (${fruitYield(life)} tokens)`} disabled={!canCollectFruit(life)} onClick={() => collect(crop.id)} />
                    </>}
                </>}
            </>}
            {(life.phase === "young" || life.stage === "growing") && <>
                <Button label="Fund next maintenance slot (1 Gold)"
                    disabled={!prepareFruitMaintenance(crop) || !hasWholeGold(wallet, card.maintenanceCost)}
                    onClick={() => maintain(crop.id)} />
                {!hasWholeGold(wallet, card.maintenanceCost) && <p>Maintenance requires 1 Gold.</p>}
            </>}
        </>}
    </section>;
}
