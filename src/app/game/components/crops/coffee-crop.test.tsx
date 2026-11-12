import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, expect, it, vi } from "vitest";
import { CoffeeCropComponent } from "./coffee-crop";
import { ParcelCropPanel } from "./parcel-crop";
import { createCrop } from "@/game-data/crop/crop-functions";
import { newCoffeeAdult, tickCoffeeAdult, prepareCoffeeProduction } from "@/game-data/crop/coffee-functions";
import { newLongTermYoung } from "@/game-data/crop/long-term-crop-functions";
import { createLand } from "@/game-data/land/land-functions";
import type { CoffeeCrop } from "@/game-data/crop/crop-types";

const view = vi.hoisted(() => ({ wallet: { gold: 100, silver: 0 }, crops: [], fundCropDevelopment: () => true, fundCropMaintenance: () => true, fundCropProduction: () => true, fundAllCoffeeMaintenance: () => true }));
vi.mock("@/state/game-state", () => ({ useGameStore: (selector: (state: typeof view) => unknown) => selector(view) }));
// The test runner uses classic JSX; Next supplies the automatic JSX runtime.
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());
const render = (lifecycle: CoffeeCrop["lifecycle"]) => renderToStaticMarkup(React.createElement(CoffeeCropComponent, { crop: { ...createCrop("coffee", "land", 1, 1), lifecycle } }));

it("renders the coffee chooser option and preparation prices", () => {
  expect(renderToStaticMarkup(React.createElement(ParcelCropPanel, { land: createLand("plains") }))).toContain("☕ Coffee");
  const html = render(createCrop("coffee", "land", 1, 1).lifecycle);
  for (const text of ["Seedling paid (5 Gold)", "Fund Site clearing (1 Gold)", "Fund Seedling hauling (1 Gold)", "Fund Planting (2 Gold)"]) expect(html).toContain(text);
});

it("renders young care and full progress beside first-harvest ineligibility", () => {
  expect(render(newLongTermYoung())).toContain("Fund All for F&amp;M");
  const html = render(newCoffeeAdult({ year: 4, month: 11 }));
  expect(html).toContain("Calendar progress: 4 / 4");
  expect(html).toContain("First eligible harvest: November, year 5");
  expect(html).toContain("This cycle is ineligible");
});

it("renders new care beside old output and its independent processing deadline", () => {
  const november = tickCoffeeAdult(newCoffeeAdult({ year: 4, month: 1 }), { year: 4, month: 11 }, () => 0);
  const december = tickCoffeeAdult(november, { year: 4, month: 12 }, () => 0);
  const html = render(december);
  expect(html).toContain("Target harvest: November, year 5");
  expect(html).toContain("November, year 4 harvest");
  expect(html).toContain("March, year 5");
  expect(html).toContain("Remaining F&amp;M cost: 8 Gold.");
  const crop = { ...createCrop("coffee", "land", 4, 1), lifecycle: november };
  const raw = prepareCoffeeProduction(crop, "harvesting")!.crop;
  const processed = prepareCoffeeProduction(raw, "dryingMilling")!.crop;
  const batchHtml = render(processed.lifecycle);
  expect(batchHtml).toContain("Locked batch: 0.2 coffee");
  expect(batchHtml).toContain("January, year 5");
  expect(batchHtml).toContain("Held produce does not spoil.");
});
