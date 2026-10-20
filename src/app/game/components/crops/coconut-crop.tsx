"use client";

import { CROP_DEFINITIONS } from "@/game-data/crop/crop-definitions";

import { COCONUT_CARD as card } from "@/game-data/crop/coconut-data";
import { adultHighChance, adultProgress, bonusChance, canCollectCoconut, coconutYield, paymentPoints,
    periodMonth, pointTotal, prepareCoconutFullMaintenance, youngProgress } from "@/game-data/crop/coconut-functions";
import { hasWholeGold } from "@/game-data/crop/crop-functions";
import type { CoconutCrop } from "@/game-data/crop/crop-types";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

const developmentTasks = ["siteClearing", "seedlingHauling", "planting"] as const;
const productionTasks = ["climbingPiling", "husking", "hauling"] as const;
const labels = { siteClearing: "Site clearing", seedlingHauling: "Seedling hauling", planting: "Planting", hauling: "Hauling", climbingPiling: "Climbing/piling", husking: "Husking" };

export function CoconutCropComponent({ crop }: { crop: CoconutCrop }) {
    const wallet = useGameStore((s) => s.wallet);
    const develop = useGameStore((s) => s.fundCropDevelopment);
    const maintain = useGameStore((s) => s.fundCropMaintenance);
    const produce = useGameStore((s) => s.fundCropProduction);
    const collect = useGameStore((s) => s.harvestCrop);
    const fundAllMaintenance = useGameStore((s) => s.fundAllCoconutMaintenance);
    const fullMaintenance = prepareCoconutFullMaintenance(crop);
    const life = crop.lifecycle;
    const affordable = hasWholeGold(wallet, card.maintenanceCost);
    return <section className="space-y-3 border bg-white p-4">
        <h3 className="font-semibold"><span aria-hidden="true">{CROP_DEFINITIONS.coconut.emoji}</span> Active Coconut Crop</h3>
        {!affordable && <p className="text-sm text-amber-700">Not enough whole gold for unpaid expenses.</p>}
        {life.phase === "development" && <>
            <p>Development · Seedling paid</p>
            <p>Complete all three expenses to begin young month 1. Site clearing does not clear the land parcel.</p>
            {developmentTasks.map((task) => <div key={task}>
                <p>{labels[task]}: {life.development[task] ? "Paid" : "Unpaid"}</p>
                <Button label={`Fund ${labels[task]} (${card.developmentCosts[task].gold} Gold)`}
                    disabled={life.development[task] || !hasWholeGold(wallet, card.developmentCosts[task])}
                    onClick={() => develop(crop.id, task)} />
            </div>)}
        </>}
        {life.phase === "young" && <>
            <p>Young · Crop month {life.cropMonth} · Period month {periodMonth(life.cropMonth)} / {card.developmentMaintenancePeriodMonths}</p>
            <p>Development growth: {youngProgress(life)} / {card.developmentTokens} ({life.regularTokens} regular + {life.bonusTokens} bonus)</p>
            <p>Development maintenance: {life.payments.length} / {card.developmentMaintenanceSlots} · Points: {pointTotal(life) / 100} · Bonus chance: {Number((bonusChance(life) * 100).toFixed(2))}%</p>
            <p>Each payment now adds {paymentPoints(life.cropMonth) / 100} points. Earlier payments keep their value.</p>
            <p>Regular growth arrives every third crop month. The bonus resolves after period month 6 ends, then slots reset.</p>
            <Button label={`Fund development maintenance (${card.maintenanceCost.gold} Gold)`}
                disabled={!affordable || life.payments.length >= card.developmentMaintenanceSlots} onClick={() => maintain(crop.id)} />
            <Button label={`Fund all maintenance (${fullMaintenance?.cost.gold ?? 0} Gold)`}
                className="ml-2"
                disabled={!fullMaintenance || !hasWholeGold(wallet, fullMaintenance.cost)}
                onClick={() => fundAllMaintenance(crop.id)} />
        </>}
        {life.phase === "adult" && <>
            <p>Adult · {life.stage === "resting" ? "Between cycles" : `Cycle month ${life.cycleMonth}`} · Production growth: {adultProgress(life)} / {card.productionTokens}</p>
            {life.lastHarvest && <p role="status">Last harvest: {life.lastHarvest.outcome} · {life.lastHarvest.quantity} produce tokens.</p>}
            <p>Production maintenance: {life.payments.length} / {card.productionMaintenanceSlots}</p>
            {life.stage !== "resting" && <p>Current maintenance: {life.payments[0] ? `Paid in month ${life.payments[0].month}` : "Unfunded"}</p>}
            {life.stage === "resting" ? <>
                <p>This harvest cycle has ended. The next successful monthly advance starts month 1 of the next cycle.</p>
            </> : life.stage === "growing" ? <>
                <p>High-yield chance: {adultHighChance(life) * 100}%. Month 1 funding guarantees high yield; month 2 funding gives {card.monthTwoChance * 100}%. Normally ready in cycle month {card.productionCycleMonths}.</p>
                <Button label={`Fund production maintenance (${card.maintenanceCost.gold} Gold)`} disabled={!affordable || life.payments.length >= card.productionMaintenanceSlots} onClick={() => maintain(crop.id)} />
            </> : <>
                <p>{life.readyAge === 0 ? "Harvest-ready" : "Fallen fruit"} · Stored result: {life.yieldResult} · Available yield: {coconutYield(life)} tokens</p>
                <p>{3 - life.readyAge} successful monthly advances before loss. Fruit falls on the first advance after readiness, reducing yield.</p>
                {life.fromOverflow && <p>Early fruit from surplus young growth has fixed low yield. F&amp;M cannot improve this harvest.</p>}
                {productionTasks.map((task) => {
                    const waived = task === "climbingPiling" && life.readyAge > 0;
                    const paid = life.production[task];
                    const requiresHusking = task === "hauling" && !life.production.husking;
                    const cost = card.productionCosts[task];
                    return <div key={task}>
                        <p>{labels[task]}: {waived ? (paid ? "Waived; prior payment is not refunded" : "Waived for fallen fruit") : paid ? "Paid" : "Unpaid — required"}</p>
                        {requiresHusking && <p>Requires husking first.</p>}
                        <Button label={`Fund ${labels[task]} (${cost.gold} Gold)`} disabled={waived || paid || requiresHusking || !hasWholeGold(wallet, cost)} onClick={() => produce(crop.id, task)} />
                    </div>;
                })}
                <Button label={`Collect Coconut (${coconutYield(life)} tokens)`} disabled={!canCollectCoconut(life)} onClick={() => collect(crop.id)} />
                <p>Collection or loss retains the trees. Month 1 of the next cycle starts on the following successful monthly advance. Production expenses reset without refunds.</p>
            </>}
        </>}
    </section>;
}
