import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, expect, it, vi } from "vitest";
import { BananaCropComponent } from "./banana-crop";
import { createCrop } from "@/game-data/crop/crop-functions";
import { newBananaAdultCycle, tickBananaAdult } from "@/game-data/crop/banana-functions";
import { newLongTermYoung } from "@/game-data/crop/long-term-crop-functions";
import type { BananaAdult, BananaCrop } from "@/game-data/crop/crop-types";

const view = vi.hoisted(() => ({ wallet: { gold: 100, silver: 0 }, fundCropDevelopment: () => true, fundCropMaintenance: () => true, fundCropProduction: () => true, fundAllBananaMaintenance: () => true }));
vi.mock("@/state/game-state", () => ({ useGameStore: (selector: (state: typeof view) => unknown) => selector(view) }));
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());
const render = (lifecycle: BananaCrop["lifecycle"]) => renderToStaticMarkup(React.createElement(BananaCropComponent, { crop: { ...createCrop("banana", "land", 1, 1), lifecycle } }));

it("shows banana preparation costs and separate site clearing", () => {
  const html = render(createCrop("banana", "land", 1, 1).lifecycle);
  for (const phrase of ["Seedling paid (6 Gold)", "Fund Site clearing (1 Gold)", "Fund Seedling hauling (2 Gold)", "Fund Planting (1 Gold)", "does not clear the land parcel"]) expect(html).toContain(phrase);
});

it("shows young care slots and period weight", () => {
  const html = render(newLongTermYoung());
  for (const phrase of ["Young", "Crop month 1", "0 / 11", "Bonus chance: 0%", "adds 1 point", "Fund All for F&amp;M (11 Gold)"]) expect(html).toContain(phrase);
});

it("shows adult weights, stored yield, costs, and the one-month deadline", () => {
  const adult = {
    ...newBananaAdultCycle(),
    stage: "growing",
    cycleMonth: 2,
    payments: [{ month: 1, weightHundredths: 100 }],
  } satisfies BananaAdult;
  const ready = tickBananaAdult(adult, () => 0);
  const html = render(ready);
  for (const phrase of ["Month 3 / 3", "Stored result: high", "7 bananas", "Harvest bananas (2 Gold)", "must happen before hauling", "next successful monthly advance"]) expect(html).toContain(phrase);
});
