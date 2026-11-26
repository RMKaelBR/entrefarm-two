"use client";

import { BANANA_CARD as card } from "@/game-data/crop/long-term-crop-data";
import { bananaHighChance, bananaYield, prepareBananaFullMaintenance, prepareBananaMaintenance, prepareBananaPreparation, prepareBananaProduction } from "@/game-data/crop/banana-functions";
import { developmentProgress, maintenanceWeightTotal, youngBonusChance, youngPaymentWeight, youngPeriodMonth } from "@/game-data/crop/long-term-crop-functions";
import { hasWholeGold } from "@/game-data/crop/crop-functions";
import { formatYield } from "@/game-data/yield/calculate-yield";
import type { BananaCrop } from "@/game-data/crop/crop-types";
import { useGameStore } from "@/state/game-state";
import { CROP_DEFINITIONS } from "@/game-data/crop/crop-definitions";
import { Button } from "../button";

const tasks = ["siteClearing", "seedlingHauling", "planting"] as const;
const labels = { siteClearing: "Site clearing", seedlingHauling: "Seedling hauling", planting: "Planting" };
const percent = (chance: number) => `${Number((chance * 100).toFixed(2))}%`;

export function BananaCropComponent({ crop }: { crop: BananaCrop }) {
  const wallet = useGameStore(s => s.wallet);
  const develop = useGameStore(s => s.fundCropDevelopment);
  const maintain = useGameStore(s => s.fundCropMaintenance);
  const fundAll = useGameStore(s => s.fundAllBananaMaintenance);
  const produce = useGameStore(s => s.fundCropProduction);
  const life = crop.lifecycle;
  const care = prepareBananaMaintenance(crop);
  const allCare = prepareBananaFullMaintenance(crop);
  const fundCare = <>
    <Button label={`Fund care (${card.maintenanceCost.gold} Gold)`} disabled={!care || !hasWholeGold(wallet, care.cost)} onClick={() => maintain(crop.id)} />
    <Button label={`Fund All for F&M (${allCare?.cost.gold ?? 0} Gold)`} disabled={!allCare || !hasWholeGold(wallet, allCare.cost)} onClick={() => fundAll(crop.id)} />
  </>;
  return <section className="space-y-3 border bg-white p-4">
    <h3 className="font-semibold"><span aria-hidden="true">{CROP_DEFINITIONS.banana.emoji}</span> Active Banana Crop</h3>
    {life.phase === "development" ? <>
      <p>Development · Seedling paid (6 Gold).</p>
      <p>Complete all three expenses to begin young month 1. Site clearing costs 1 Gold but does not clear the land parcel.</p>
      {tasks.map(task => {
        const payment = prepareBananaPreparation(crop, task);
        return <div key={task}><p>{labels[task]}: {life.development[task] ? "Paid" : "Unpaid"}</p>
          <Button label={`Fund ${labels[task]} (${card.developmentCosts[task].gold} Gold)`} disabled={!payment || !hasWholeGold(wallet, payment.cost)} onClick={() => develop(crop.id, task)} />
        </div>;
      })}
    </> : life.phase === "young" ? <>
      <p>Young · Crop month {life.cropMonth} · Period month {youngPeriodMonth(life.cropMonth)} / 6</p>
      <p>Development growth: {developmentProgress(life, card.developmentTokens)} / 4 ({life.regularTokens} regular + {life.bonusTokens} bonus)</p>
      <p>Care: {life.payments.length} / 11 slots · Points: {maintenanceWeightTotal(life.payments) / 100} · Bonus chance: {percent(youngBonusChance(life, 11))}</p>
      <p>Each 1 Gold payment now adds {youngPaymentWeight(life.cropMonth) / 100} {youngPaymentWeight(life.cropMonth) === 100 ? "point" : "points"}. Earlier payments keep their value; the bonus resolves after period month 6.</p>
      {fundCare}
    </> : <>
      <p>Adult · Crop-relative Month {life.cycleMonth} / 3 · Production meter {life.progress} / 1</p>
      {life.stage === "growing" ? <>
        <p>Production care: {life.payments.length} / 2 slots · High-yield chance: {percent(bananaHighChance(life))}</p>
        <p>Care costs 1 Gold per slot. Month 1 care weighs 100%; Month 2 care weighs 75%.</p>
        {fundCare}
      </> : <>
        <p>Stored result: {life.yieldResult} · Harvest yield: {formatYield(bananaYield(life))} bananas.</p>
        {life.fromOverflow && <p>Surplus development tokens fix this opportunity at low yield; no adult care is available.</p>}
        {life.production.harvesting ? <p>Harvested batch: {formatYield(life.batch?.quantity ?? bananaYield(life))} bananas.</p> : <Button label={`Harvest bananas (${card.productionCosts.harvesting.gold} Gold)`} disabled={!prepareBananaProduction(crop, "harvesting") || !hasWholeGold(wallet, card.productionCosts.harvesting)} onClick={() => produce(crop.id, "harvesting")} />}
        {life.production.harvesting && <Button label={`Haul bananas (${card.productionCosts.hauling.gold} Gold)`} disabled={!prepareBananaProduction(crop, "hauling") || !hasWholeGold(wallet, card.productionCosts.hauling)} onClick={() => produce(crop.id, "hauling")} />}
        <p>Harvesting must happen before hauling. Any unharvested fruit or batch left unhauled expires on the next successful monthly advance.</p>
      </>}
    </>}
  </section>;
}
