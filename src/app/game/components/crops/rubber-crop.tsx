"use client";

import { rubberTappingYield } from "@/game-data/crop/rubber-functions";
import { formatYield } from "@/game-data/yield/calculate-yield";

import { CROP_DEFINITIONS } from "@/game-data/crop/crop-definitions";
import { RUBBER_CARD as card } from "@/game-data/crop/long-term-crop-data";
import { prepareRubberPreparation, prepareRubberMaintenance, prepareRubberFullMaintenance, rubberHighChance } from "@/game-data/crop/rubber-functions";
import { developmentProgress, maintenanceWeightTotal, youngPeriodMonth, youngPaymentWeight, youngBonusChance } from "@/game-data/crop/long-term-crop-functions";
import { hasWholeGold, prepareCropProduction } from "@/game-data/crop/crop-functions";
import type { RubberCrop } from "@/game-data/crop/crop-types";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

const developmentTasks = ["siteClearing", "seedlingHauling", "planting"] as const;
const labels = { siteClearing: "Site clearing", seedlingHauling: "Seedling hauling", planting: "Planting" };
const percentage = (chance: number) => `${Number((chance * 100).toFixed(2))}%`;

export function RubberCropComponent({ crop }: { crop: RubberCrop }) {
    const wallet = useGameStore((s) => s.wallet);
    const develop = useGameStore((s) => s.fundCropDevelopment);
    const maintain = useGameStore((s) => s.fundCropMaintenance);
    const produce = useGameStore((s) => s.fundCropProduction);
    const fundAllMaintenance = useGameStore((s) => s.fundAllRubberMaintenance);
    const maintenance = prepareRubberMaintenance(crop);
    const fullMaintenance = prepareRubberFullMaintenance(crop);
    const hauling = prepareCropProduction(crop, "hauling");
    const life = crop.lifecycle;
    const tapButton = () => {
        const payment = prepareCropProduction(crop, "tapping");
        return <Button label={`Tap rubber (${card.productionCosts.tapping.gold} Gold)`}
            disabled={!payment || !hasWholeGold(wallet, payment.cost)}
            onClick={() => produce(crop.id, "tapping")} />;
    };
    return <section className="space-y-3 border bg-white p-4">
        <h3 className="font-semibold"><span aria-hidden="true">{CROP_DEFINITIONS.rubber.emoji}</span> Active Rubber Crop</h3>
        {life.phase === "development" ? <>
            <p>Development · Seedling paid</p>
            <p>Complete all three expenses to begin young month 1. Site clearing does not clear the land parcel.</p>
            {developmentTasks.map((task) => {
                const payment = prepareRubberPreparation(crop, task);
                return <div key={task}>
                    <p>{labels[task]}: {life.development[task] ? "Paid" : "Unpaid"}</p>
                    <Button label={`Fund ${labels[task]} (${card.developmentCosts[task].gold} Gold)`}
                        disabled={!payment || !hasWholeGold(wallet, payment.cost)}
                        onClick={() => develop(crop.id, task)} />
                </div>;
            })}
        </> : <>
            {life.phase === "young" ? <>
                <p>Young · Crop month {life.cropMonth} · Period month {youngPeriodMonth(life.cropMonth)} / {card.developmentMaintenancePeriodMonths}</p>
                <p>Development growth: {developmentProgress(life, card.developmentTokens)} / {card.developmentTokens} ({life.regularTokens} regular + {life.bonusTokens} bonus)</p>
                <p>Development maintenance: {life.payments.length} / {card.developmentMaintenanceSlots} · Points: {maintenanceWeightTotal(life.payments) / 100} · Bonus chance: {percentage(youngBonusChance(life, card.developmentMaintenanceSlots))}</p>
                <p>Each payment now adds {youngPaymentWeight(life.cropMonth) / 100} points. Earlier payments keep their value.</p>
                <p>Regular growth arrives every third crop month. The bonus resolves after period month 6 ends, then slots reset.</p>
            </> : <>
                <p>Adult · Month {life.cycleMonth} · Production growth: {life.progress} / {card.productionTokens}</p>
                <p>Production continues Month 1 → 2 → 3 → 1 on successful monthly advances, even while tapping or hauling is unpaid.</p>
                <p>Current tapping penalty: {life.previousCyclePenalty ? "−1 rubber from this cycle’s regular yield" : "None"}. On-time tapping avoids the next cycle’s penalty.</p>
                {life.stage === "growing" ? <>
                    <p>Production maintenance: {life.payments.length} / {card.productionMaintenanceSlots} · High-yield chance: {percentage(rubberHighChance(life))}</p>
                    <p>Care costs 1 Gold: Month 1 guarantees high yield; Month 2 gives a 75% chance. Without care, yield is low.</p>
                </> : <>
                    <p>Stored result: {life.yieldResult} · {life.tappedOnTime ? "Tapped on time" : `Ready to tap: ${formatYield(rubberTappingYield(life))} rubber`}</p>
                    {life.fromOverflow && <p>Surplus development growth: fixed 2-rubber readiness with no adult care window.</p>}
                    {tapButton()}
                </>}
                {life.lateTappingAvailable && <div>
                    <p>Late tapping: exactly 1 rubber. This opportunity expires on entry into Month 2.</p>
                    {tapButton()}
                </div>}
                <h4 className="font-semibold">Rubber near the trees</h4>
                <p>Hauling transfers remaining rubber into held produce. Held produce does not decay.</p>
                {life.batch ? <div>
                    <p>{formatYield(life.batch.quantity)} rubber near the trees.</p>
                    <p>{2 - life.batch.advancesSinceTapping} successful monthly advances until expiry.</p>
                    {life.batch.advancesSinceTapping === 0 && <p>The next advance loses 1 rubber.</p>}
                    <Button label={`Haul rubber (${card.productionCosts.hauling.gold} Gold)`}
                        disabled={!hauling || !hasWholeGold(wallet, hauling.cost)}
                        onClick={() => produce(crop.id, "hauling")} />
                </div> : <p>No rubber awaiting hauling.</p>}
            </>}
            {(life.phase === "young" || life.stage === "growing") && <>
                <Button label={`Fund ${life.phase === "young" ? "development" : "production"} maintenance (${card.maintenanceCost.gold} Gold)`}
                    disabled={!maintenance || !hasWholeGold(wallet, maintenance.cost)} onClick={() => maintain(crop.id)} />
                <Button label={`Fund all maintenance (${fullMaintenance?.cost.gold ?? 0} Gold)`} className="ml-2"
                    disabled={!fullMaintenance || !hasWholeGold(wallet, fullMaintenance.cost)} onClick={() => fundAllMaintenance(crop.id)} />
            </>}
        </>}
    </section>;
}
