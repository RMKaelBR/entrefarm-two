"use client";

import { CACAO_CARD as card } from "@/game-data/crop/long-term-crop-data";
import { cacaoAdultWeight, cacaoAvailableYield, cacaoHighChance, prepareCacaoFullMaintenance, prepareCacaoMaintenance, prepareCacaoPreparation, prepareCacaoProduction } from "@/game-data/crop/cacao-functions";
import { maintenanceWeightTotal, youngBonusChance, youngPaymentWeight, youngPeriodMonth } from "@/game-data/crop/long-term-crop-functions";
import { hasWholeGold } from "@/game-data/crop/crop-functions";
import type { CacaoCrop } from "@/game-data/crop/crop-types";
import { formatYield } from "@/game-data/yield/calculate-yield";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

const percentage = (chance: number) => `${Number((chance * 100).toFixed(2))}%`;
const developmentLabels = { siteClearing: "Site clearing", seedlingHauling: "Seedling hauling", planting: "Planting" };
const productionLabels = { harvesting: "Harvest cacao", splittingFermentingDrying: "Split, ferment and dry cacao", hauling: "Haul cacao" };

export function CacaoCropComponent({ crop }: { crop: CacaoCrop }) {
    const wallet = useGameStore(s => s.wallet);
    const develop = useGameStore(s => s.fundCropDevelopment);
    const maintain = useGameStore(s => s.fundCropMaintenance);
    const fundAll = useGameStore(s => s.fundAllCacaoMaintenance);
    const produce = useGameStore(s => s.fundCropProduction);
    const maintenance = prepareCacaoMaintenance(crop);
    const fullMaintenance = prepareCacaoFullMaintenance(crop);
    const life = crop.lifecycle;
    const quantity = life.phase === "adult" ? cacaoAvailableYield(life) : null;

    return <section className="space-y-3 border bg-white p-4">
        <h3 className="font-semibold">🍫 Active Cacao Crop</h3>
        {life.phase === "development" ? <>
            <p>Development · Seedling paid ({card.seedlingCost.gold} Gold)</p>
            <p>Complete all three expenses to begin young month 1. Site clearing does not clear the land parcel.</p>
            {(["siteClearing", "seedlingHauling", "planting"] as const).map(task => {
                const payment = prepareCacaoPreparation(crop, task);
                return <div key={task}>
                    <p>{developmentLabels[task]}: {life.development[task] ? "Paid" : "Unpaid"}</p>
                    <Button label={`Fund ${developmentLabels[task]} (${card.developmentCosts[task].gold} Gold)`}
                        disabled={!payment || !hasWholeGold(wallet, payment.cost)} onClick={() => develop(crop.id, task)} />
                </div>;
            })}
        </> : <>
            {life.phase === "young" ? <>
                <p>Young · Crop month {life.cropMonth} · Period month {youngPeriodMonth(life.cropMonth)} / {card.developmentMaintenancePeriodMonths}</p>
                <p>Development growth: {life.regularTokens + life.bonusTokens} / {card.developmentTokens} ({life.regularTokens} regular + {life.bonusTokens} bonus)</p>
                <p>F&M slots: {life.payments.length} / {card.developmentMaintenanceSlots} · Weighted points: {maintenanceWeightTotal(life.payments) / 100} · Bonus chance: {percentage(youngBonusChance(life, card.developmentMaintenanceSlots))}</p>
                <p>Current payment weight: {youngPaymentWeight(life.cropMonth)}%. Earlier payments retain their weight.</p>
                <p>Regular growth arrives every third crop month. Leaving period month 6 resolves one bonus chance and resets care. Surplus development tokens carry into adult production; young care is cleared.</p>
            </> : <>
                <p>Adult month {life.adultMonth} · Cycle month {life.cycleMonth} · {life.stage === "ready" ? "Readiness resolved" : "Growing"}</p>
                <p>Production growth: {life.progress} / {card.productionTokens} · Next readiness: adult month {life.nextReadyAt}</p>
                <p>Current-cycle F&M slots: {life.payments.length} / {card.productionMaintenanceSlots} · Prospective high-yield chance: {percentage(cacaoHighChance(life))}</p>
                <p>Weighted points: {maintenanceWeightTotal(life.payments) / 100}. {life.stage === "growing" ? `Current payment weight: ${cacaoAdultWeight(life.cycleMonth)}%.` : "Care is closed; the next cycle starts next month."}</p>
            </>}
            <Button label={`Fund F&M (${card.maintenanceCost.gold} Gold)`} disabled={!maintenance || !hasWholeGold(wallet, maintenance.cost)} onClick={() => maintain(crop.id)} />
            <Button label="Fund All for F&M" className="ml-2" disabled={!fullMaintenance || !hasWholeGold(wallet, fullMaintenance.cost)} onClick={() => fundAll(crop.id)} />
            {fullMaintenance && <p>Remaining F&M cost: {fullMaintenance.cost.gold} Gold.</p>}
            {life.phase === "adult" && <>
                <h4 className="font-semibold">Harvest and processing</h4>
                {life.opportunity && <div>
                    <p>Harvest ready: adult month {life.opportunity.readyAt} · Stored result: {life.opportunity.yieldResult}</p>
                    <p>{quantity ? `Available now: ${formatYield(quantity)} cacao.` : "No harvest available now."} Last harvest month: adult month {life.opportunity.expiresAt - 1}.</p>
                </div>}
                {life.batch && <div>
                    <p>Locked batch: {formatYield(life.batch.quantity)} cacao · Stage: {life.batch.stage}.</p>
                    <p>Finish processing and hauling in adult month {life.batch.harvestedAt}. Advancing from that month loses the unhauled batch.</p>
                </div>}
                {!life.opportunity && !life.batch && <p>No harvest or batch awaiting collection.</p>}
                {(["harvesting", "splittingFermentingDrying", "hauling"] as const).map(task => {
                    const payment = prepareCacaoProduction(crop, task);
                    return <Button key={task} label={`${productionLabels[task]} (${card.productionCosts[task].gold} Gold)`}
                        disabled={!payment || !hasWholeGold(wallet, payment.cost)} onClick={() => produce(crop.id, task)} />;
                })}
                <p>Production continues independently of collection or loss. Held cacao does not expire.</p>
            </>}
        </>}
    </section>;
}
