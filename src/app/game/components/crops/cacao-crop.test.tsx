import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, expect, it, vi } from "vitest";
import { CacaoCropComponent } from "./cacao-crop";
import { ParcelCropPanel } from "./parcel-crop";
import { createCrop } from "@/game-data/crop/crop-functions";
import { newCacaoAdult, tickCacaoAdult, prepareCacaoProduction } from "@/game-data/crop/cacao-functions";
import { newLongTermYoung } from "@/game-data/crop/long-term-crop-functions";
import { createLand } from "@/game-data/land/land-functions";
import type { CacaoCrop } from "@/game-data/crop/crop-types";

const view = vi.hoisted(() => ({ wallet: { gold: 100, silver: 0 }, crops: [], fundCropDevelopment: () => true, fundCropMaintenance: () => true, fundCropProduction: () => true, fundAllCacaoMaintenance: () => true }));
vi.mock("@/state/game-state", () => ({ useGameStore: (selector: (state: typeof view) => unknown) => selector(view) }));
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());
const render = (lifecycle: CacaoCrop["lifecycle"]) => renderToStaticMarkup(React.createElement(CacaoCropComponent, { crop: { ...createCrop("cacao", "land", 1, 1), lifecycle } }));
function ready() {
  let life = newCacaoAdult();
  while (life.adultMonth < 6) life = tickCacaoAdult(life, () => 0);
  return life;
}

it("renders the chooser and exact preparation prices", () => {
  expect(renderToStaticMarkup(React.createElement(ParcelCropPanel, { land: createLand("plains") }))).toContain("🍫 Cacao");
  const html = render(createCrop("cacao", "land", 1, 1).lifecycle);
  for (const text of ["Seedling paid (4 Gold)", "Fund Site clearing (1 Gold)", "Fund Seedling hauling (1 Gold)", "Fund Planting (1 Gold)", "begin young month 1"]) expect(html).toContain(text);
});

it("renders young and growing adult targets, weights and bulk care prices", () => {
  const young = render(newLongTermYoung());
  for (const text of ["Development growth: 0 / 11", "F&amp;M slots: 0 / 4", "Remaining F&amp;M cost: 4 Gold", "Fund All for F&amp;M", "Surplus development tokens carry"]) expect(young).toContain(text);
  const adult = render(newCacaoAdult());
  for (const text of ["Production growth: 0 / 2", "Next readiness: adult month 6", "F&amp;M slots: 0 / 5", "Remaining F&amp;M cost: 5 Gold"]) expect(adult).toContain(text);
});

it("renders old output beside fresh cycle care and the unchanged month-12 schedule", () => {
  const html = render(tickCacaoAdult(ready(), () => 0));
  for (const text of ["Adult month 7", "Cycle month 1", "Next readiness: adult month 12", "Harvest ready: adult month 6", "Stored result: low", "Available now: 0.1 cacao", "Last harvest month: adult month 7", "Remaining F&amp;M cost: 5 Gold"]) expect(html).toContain(text);
});

it("renders harvested/processed deadlines, hauled and expired states", () => {
  const crop = { ...createCrop("cacao", "land", 1, 1), lifecycle: ready() };
  const raw = prepareCacaoProduction(crop, "harvesting")!.crop;
  const processed = prepareCacaoProduction(raw, "splittingFermentingDrying")!.crop;
  for (const batch of [raw, processed]) {
    const html = render(batch.lifecycle);
    for (const text of ["Locked batch: 0.1 cacao", "Finish processing and hauling in adult month 6", "Advancing from that month loses", "Held cacao does not expire"]) expect(html).toContain(text);
  }
  expect(render(processed.lifecycle)).toContain("Stage: processed");
  expect(render(prepareCacaoProduction(processed, "hauling")!.crop.lifecycle)).toContain("No harvest or batch awaiting collection");
  let expired = ready();
  expired = tickCacaoAdult(tickCacaoAdult(expired, () => 0), () => 0);
  expect(render(expired)).toContain("No harvest or batch awaiting collection");
});

it("disables unavailable production and unaffordable care even with silver", () => {
  view.wallet = { gold: 0, silver: 99 };
  const html = render(newCacaoAdult());
  expect((html.match(/disabled=""/g) ?? []).length).toBe(5);
  view.wallet = { gold: 100, silver: 0 };
  const readyHtml = render(ready());
  expect((readyHtml.match(/disabled=""/g) ?? []).length).toBe(4);
});
