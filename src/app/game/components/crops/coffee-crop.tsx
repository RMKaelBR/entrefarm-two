"use client";

import { CROP_DEFINITIONS } from "@/game-data/crop/crop-definitions";
import { COFFEE_CARD as card } from "@/game-data/crop/long-term-crop-data";
import { coffeeAdultWeight, coffeeAvailableYield, coffeeCareBlockReason, coffeeHighChance, prepareCoffeeFullMaintenance, prepareCoffeeMaintenance, prepareCoffeePreparation, prepareCoffeeProduction } from "@/game-data/crop/coffee-functions";
import { developmentProgress, maintenanceWeightTotal, youngBonusChance, youngPaymentWeight, youngPeriodMonth } from "@/game-data/crop/long-term-crop-functions";
import { hasWholeGold } from "@/game-data/crop/crop-functions";
import type { CoffeeCrop } from "@/game-data/crop/crop-types";
import { formatYield } from "@/game-data/yield/calculate-yield";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const date = (index: number) => `${months[index % 12]}, year ${Math.floor(index / 12) + 1}`;
const percentage = (chance: number) => `${Number((chance * 100).toFixed(2))}%`;
const developmentLabels = { siteClearing: "Site clearing", seedlingHauling: "Seedling hauling", planting: "Planting" };
const productionLabels = { harvesting: "Harvest coffee", dryingMilling: "Dry and mill coffee", hauling: "Haul coffee" };

export function CoffeeCropComponent({ crop }: { crop: CoffeeCrop }) {
    const wallet = useGameStore(s => s.wallet);
    const develop = useGameStore(s => s.fundCropDevelopment);
    const maintain = useGameStore(s => s.fundCropMaintenance);
    const fundAll = useGameStore(s => s.fundAllCoffeeMaintenance);
    const produce = useGameStore(s => s.fundCropProduction);
    const maintenance = prepareCoffeeMaintenance(crop);
    const fullMaintenance = prepareCoffeeFullMaintenance(crop);
    const life = crop.lifecycle;
    const careReason = life.phase === "adult" ? coffeeCareBlockReason(life) : null;
    const quantity = life.phase === "adult" ? coffeeAvailableYield(life) : null;

    return <section className="space-y-3 border bg-white p-4">
        <h3 className="font-semibold"><span aria-hidden="true">{CROP_DEFINITIONS.coffee.emoji}</span> Active Coffee Crop</h3>
        {life.phase === "development" ? <>
            <p>Development · Seedling paid (5 Gold)</p>
            <p>Complete all three expenses to begin young month 1. Site clearing does not clear the land parcel.</p>
            {(["siteClearing", "seedlingHauling", "planting"] as const).map(task => {
                const payment = prepareCoffeePreparation(crop, task);
                return <div key={task}>
                    <p>{developmentLabels[task]}: {life.development[task] ? "Paid" : "Unpaid"}</p>
                    <Button label={`Fund ${developmentLabels[task]} (${card.developmentCosts[task].gold} Gold)`}
                        disabled={!payment || !hasWholeGold(wallet, payment.cost)} onClick={() => develop(crop.id, task)} />
                </div>;
            })}
        </> : <>
            {life.phase === "young" ? <>
                <p>Young · Crop month {life.cropMonth} · Period month {youngPeriodMonth(life.cropMonth)} / 6</p>
                <p>Development growth: {developmentProgress(life, card.developmentTokens)} / 8 ({life.regularTokens} regular + {life.bonusTokens} bonus)</p>
                <p>F&M slots: {life.payments.length} / 14 · Weighted points: {maintenanceWeightTotal(life.payments) / 100} · Bonus chance: {percentage(youngBonusChance(life, 14))}</p>
                <p>Current payment weight: {youngPaymentWeight(life.cropMonth)}%. Earlier payments retain their weight.</p>
                <p>Regular growth arrives every third crop month. Leaving period month 6 resolves one bonus chance and resets care. Adulthood discards young care and surplus growth.</p>
            </> : <>
                <p>Adult · {months[life.calendar.month - 1]}, year {life.calendar.year}</p>
                <p>December–November cycle · Target harvest: November, year {life.cycleHarvestYear}</p>
                <p>Calendar progress: {life.progress} / 4</p>
                <p>First eligible harvest: November, year {life.firstEligibleHarvestYear}. {life.cycleHarvestYear < life.firstEligibleHarvestYear ? "This cycle is ineligible, even with full progress." : "This cycle is eligible; a harvest opportunity opens on November entry."}</p>
                <p>Current-cycle F&M slots: {life.payments.length} / 8 · High-yield chance: {percentage(coffeeHighChance(life))}</p>
                {life.calendar.month !== 11 && <p>Current payment weight: {coffeeAdultWeight(life.calendar.month)}%.</p>}
            </>}
            <Button label="Fund F&M (1 Gold)" disabled={!maintenance || !hasWholeGold(wallet, maintenance.cost)} onClick={() => maintain(crop.id)} />
            <Button label="Fund All for F&M" className="ml-2" disabled={!fullMaintenance || !hasWholeGold(wallet, fullMaintenance.cost)} onClick={() => fundAll(crop.id)} />
            {fullMaintenance && <p>Remaining F&M cost: {fullMaintenance.cost.gold} Gold.</p>}
            {careReason && <p>{careReason}</p>}
            {life.phase === "adult" && <>
                <h4 className="font-semibold">Harvest and processing</h4>
                {life.opportunity && <div>
                    <p>November, year {life.opportunity.harvestYear} harvest · Stored result: {life.opportunity.yieldResult}</p>
                    <p>{quantity ? `Available now: ${formatYield(quantity)} coffee.` : "No harvest available now."} Unharvested yield expires on entry into {date(life.opportunity.expiresAt)}.</p>
                </div>}
                {life.batch && <div>
                    <p>Locked batch: {formatYield(life.batch.quantity)} coffee · Harvested in {date(life.batch.harvestedAt)}.</p>
                    <p>{life.batch.stage === "harvested" ? "Drying and milling must happen in the harvest month." : "Dried and milled: haul by the end of the month following harvest."} Batch expires on entry into {date(life.batch.expiresAt)}.</p>
                </div>}
                {!life.opportunity && !life.batch && <p>No harvest or batch awaiting collection.</p>}
                {(["harvesting", "dryingMilling", "hauling"] as const).map(task => {
                    const payment = prepareCoffeeProduction(crop, task);
                    return <Button key={task} label={`${productionLabels[task]} (${card.productionCosts[task].gold} Gold)`}
                        disabled={!payment || !hasWholeGold(wallet, payment.cost)} onClick={() => produce(crop.id, task)} />;
                })}
                <p>Hauling transfers coffee to held produce. Held produce does not spoil. New-cycle care never changes an older harvest or batch.</p>
            </>}
        </>}
    </section>;
}
