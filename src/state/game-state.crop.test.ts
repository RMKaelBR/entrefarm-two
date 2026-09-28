import { beforeEach, describe, expect, it } from "vitest";
import { createCrop, prepareCropDevelopment } from "@/game-data/crop/crop-functions";
import type { CropPlantingRecord } from "@/game-data/crop/crop-types";
import { createLand } from "@/game-data/land/land-functions";
import { createLoan } from "@/game-data/loan/loan-functions";
import { useGameStore } from "./game-state";

const prepareDevelopedCrop = () => {
  const landId = useGameStore.getState().lands[0].id;
  expect(useGameStore.getState().startCropPlanting("rice", landId)).toBe(true);
  const cropId = useGameStore.getState().crops[0].id;
  expect(useGameStore.getState().fundCropDevelopment(cropId, "plowing")).toBe(true);
  expect(useGameStore.getState().fundCropDevelopment(cropId, "planting")).toBe(true);
  return cropId;
};

const matureCurrentCrop = () => {
  useGameStore.getState().advanceWorldTime();
  useGameStore.getState().advanceWorldTime();
};

const fundProduction = (cropId: string) => {
  expect(useGameStore.getState().fundCropProduction(cropId, "harvesting")).toBe(true);
  expect(useGameStore.getState().fundCropProduction(cropId, "hauling")).toBe(true);
  expect(useGameStore.getState().fundCropProduction(cropId, "drying")).toBe(true);
};

describe("irrigated rice store actions", () => {
  beforeEach(() => {
    useGameStore.setState({
      year: 1,
      quarter: 1,
      month: 1,
      wallet: { gold: 20, silver: 0 },
      bank: { gold: 7, silver: 0 },
      lands: [createLand("riverlands")],
      crops: [],
      cropPlantingHistory: [],
      produceInventory: [],
      loans: [],
      children: [],
      hasActiveGame: true,
    });
  });

  it("harvests three rice tokens without maintenance and does not refund", () => {
    const cropId = prepareDevelopedCrop();
    matureCurrentCrop();
    fundProduction(cropId);

    expect(useGameStore.getState().harvestCrop(cropId)).toBe(true);
    expect(useGameStore.getState()).toMatchObject({
      wallet: { gold: 12, silver: 0 },
      bank: { gold: 7, silver: 0 },
      crops: [],
    });
    expect(useGameStore.getState().produceInventory).toHaveLength(3);
    expect(useGameStore.getState().cropPlantingHistory).toHaveLength(1);
  });

  it("harvests five rice tokens after all four maintenance spaces", () => {
    const cropId = prepareDevelopedCrop();
    useGameStore.getState().advanceWorldTime();

    for (let index = 0; index < 4; index += 1) {
      expect(useGameStore.getState().fundCropMaintenance(cropId)).toBe(true);
    }
    expect(useGameStore.getState().fundCropMaintenance(cropId)).toBe(false);

    useGameStore.getState().advanceWorldTime();
    fundProduction(cropId);
    expect(useGameStore.getState().harvestCrop(cropId)).toBe(true);
    expect(useGameStore.getState().wallet).toEqual({ gold: 8, silver: 0 });
    expect(useGameStore.getState().produceInventory).toHaveLength(5);
  });

  it("rejects unaffordable seed even when silver is available", () => {
    useGameStore.setState({ wallet: { gold: 0, silver: 9 } });
    const before = useGameStore.getState();

    expect(before.startCropPlanting("rice", before.lands[0].id)).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().crops).toBe(before.crops);
    expect(useGameStore.getState().cropPlantingHistory).toBe(before.cropPlantingHistory);
  });

  it("rejects planting on ineligible or occupied land", () => {
    const plains = createLand("plains");
    useGameStore.setState({ lands: [plains] });
    expect(useGameStore.getState().startCropPlanting("rice", plains.id)).toBe(false);

    const riverland = createLand("riverlands");
    useGameStore.setState({ lands: [riverland], month: 2 });
    expect(useGameStore.getState().startCropPlanting("rice", riverland.id)).toBe(true);
    const wallet = useGameStore.getState().wallet;
    expect(useGameStore.getState().startCropPlanting("rice", riverland.id)).toBe(false);
    expect(useGameStore.getState().wallet).toBe(wallet);
  });

  it("keeps development payments atomic and allows completion in later months", () => {
    const landId = useGameStore.getState().lands[0].id;
    useGameStore.getState().startCropPlanting("rice", landId);
    const cropId = useGameStore.getState().crops[0].id;

    useGameStore.setState({ wallet: { gold: 1, silver: 9 } });
    const before = useGameStore.getState();
    expect(before.fundCropDevelopment(cropId, "plowing")).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().crops).toBe(before.crops);

    useGameStore.setState({ wallet: { gold: 2, silver: 0 } });
    expect(useGameStore.getState().fundCropDevelopment(cropId, "plowing")).toBe(true);
    const after = useGameStore.getState();
    expect(after.fundCropDevelopment(cropId, "plowing")).toBe(false);
    expect(useGameStore.getState().wallet).toBe(after.wallet);

    useGameStore.setState({ month: 2, wallet: { gold: 1, silver: 0 } });
    expect(useGameStore.getState().fundCropDevelopment(cropId, "planting")).toBe(true);
  });

  it("does not mature incomplete development or allow early production", () => {
    const landId = useGameStore.getState().lands[0].id;
    useGameStore.getState().startCropPlanting("rice", landId);
    const cropId = useGameStore.getState().crops[0].id;
    useGameStore.getState().fundCropDevelopment(cropId, "plowing");

    useGameStore.setState({ month: 2 });
    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState().crops[0].maturity.timeTokens).toBe(0);
    expect(useGameStore.getState().fundCropProduction(cropId, "harvesting")).toBe(false);
    expect(useGameStore.getState().harvestCrop(cropId)).toBe(false);
  });

  it("requires every production expense and charges each only once", () => {
    const cropId = prepareDevelopedCrop();
    matureCurrentCrop();

    expect(useGameStore.getState().harvestCrop(cropId)).toBe(false);
    expect(useGameStore.getState().fundCropProduction(cropId, "harvesting")).toBe(true);
    const afterHarvesting = useGameStore.getState();
    expect(afterHarvesting.fundCropProduction(cropId, "harvesting")).toBe(false);
    expect(useGameStore.getState().wallet).toBe(afterHarvesting.wallet);
    expect(useGameStore.getState().harvestCrop(cropId)).toBe(false);

    expect(useGameStore.getState().fundCropProduction(cropId, "hauling")).toBe(true);
    expect(useGameStore.getState().fundCropProduction(cropId, "drying")).toBe(true);
    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState().harvestCrop(cropId)).toBe(true);
  });

  it("allows more than four starts in the same year", () => {
    const lands = Array.from({ length: 6 }, () => createLand("riverlands"));
    useGameStore.setState({ lands });
    for (const land of lands) {
      expect(useGameStore.getState().startCropPlanting("rice", land.id)).toBe(true);
    }
    expect(useGameStore.getState().crops).toHaveLength(6);
    expect(useGameStore.getState().cropPlantingHistory).toHaveLength(6);
  });

  it.each(Array.from({ length: 12 }, (_, index) => index + 1))(
    "starts a three-month cycle in month %i, including year boundaries", (month) => {
      useGameStore.setState({ month, quarter: Math.ceil(month / 3) });
      const cropId = prepareDevelopedCrop();
      expect(useGameStore.getState().fundCropMaintenance(cropId)).toBe(false);
      expect(useGameStore.getState().fundCropProduction(cropId, "harvesting")).toBe(false);
      useGameStore.getState().advanceWorldTime();
      expect(useGameStore.getState().fundCropMaintenance(cropId)).toBe(true);
      expect(useGameStore.getState().harvestCrop(cropId)).toBe(false);
      useGameStore.getState().advanceWorldTime();
      expect(useGameStore.getState().month).toBe((month + 1) % 12 + 1);
      expect(useGameStore.getState().year).toBe(month >= 11 ? 2 : 1);
      expect(useGameStore.getState().fundCropMaintenance(cropId)).toBe(false);
      fundProduction(cropId);
      expect(useGameStore.getState().harvestCrop(cropId)).toBe(true);
    },
  );

  it("starts the clock only after delayed preparation and tracks staggered crops", () => {
    const firstLand = useGameStore.getState().lands[0];
    const secondLand = createLand("riverlands");
    useGameStore.setState({ lands: [firstLand, secondLand], month: 11, quarter: 4 });
    useGameStore.getState().startCropPlanting("rice", firstLand.id);
    const firstId = useGameStore.getState().crops[0].id;
    useGameStore.getState().fundCropDevelopment(firstId, "plowing");
    useGameStore.getState().advanceWorldTime();
    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState().crops[0].maturity.timeTokens).toBe(0);
    expect(useGameStore.getState().fundCropMaintenance(firstId)).toBe(false);
    useGameStore.getState().fundCropDevelopment(firstId, "planting");
    useGameStore.getState().advanceWorldTime();
    useGameStore.getState().startCropPlanting("rice", secondLand.id);
    const secondId = useGameStore.getState().crops[1].id;
    useGameStore.getState().fundCropDevelopment(secondId, "planting");
    useGameStore.getState().fundCropDevelopment(secondId, "plowing");
    expect(useGameStore.getState().crops.map(crop => crop.maturity.timeTokens)).toEqual([1, 0]);
    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState().crops.map(crop => crop.maturity.timeTokens)).toEqual([2, 1]);
    expect(useGameStore.getState().fundCropMaintenance(firstId)).toBe(false);
    expect(useGameStore.getState().fundCropMaintenance(secondId)).toBe(true);
    expect(useGameStore.getState().fundCropProduction(secondId, "harvesting")).toBe(false);
  });

  it("keeps mature crops and their yield unchanged until harvest, occupying the parcel", () => {
    const cropId = prepareDevelopedCrop();
    matureCurrentCrop();
    fundProduction(cropId);
    const crop = useGameStore.getState().crops[0];
    const wallet = useGameStore.getState().wallet;
    for (let index = 0; index < 14; index += 1) {
      useGameStore.getState().advanceWorldTime();
      expect(useGameStore.getState().crops[0]).toBe(crop);
      expect(useGameStore.getState().startCropPlanting("rice", crop.landId)).toBe(false);
    }
    expect(useGameStore.getState().wallet).toBe(wallet);
    expect(useGameStore.getState().harvestCrop(cropId)).toBe(true);
    expect(useGameStore.getState().produceInventory).toHaveLength(3);
    expect(useGameStore.getState().startCropPlanting("rice", crop.landId)).toBe(true);
  });

  it("retains prior inventory across later harvests", () => {
    useGameStore.setState({
      produceInventory: [{ id: "existing-token", crop: "rice" }],
    });
    const cropId = prepareDevelopedCrop();
    matureCurrentCrop();
    fundProduction(cropId);
    useGameStore.getState().harvestCrop(cropId);

    expect(useGameStore.getState().produceInventory).toHaveLength(4);
    expect(useGameStore.getState().produceInventory[0].id).toBe("existing-token");
  });

  it("starts and resets games with fresh crop collections", () => {
    const riverland = useGameStore.getState().lands[0];
    const crop = createCrop("rice", riverland.id, 1, 1);
    useGameStore.setState({
      crops: [crop],
      cropPlantingHistory: [
        { cropId: crop.id, kind: "rice", landId: riverland.id, year: 1 },
      ],
      produceInventory: [{ id: "rice-1", crop: "rice" }],
    });

    useGameStore.getState().resetAll();
    expect(useGameStore.getState()).toMatchObject({
      crops: [],
      cropPlantingHistory: [],
      produceInventory: [],
      hasActiveGame: true,
    });
  });

  it("preserves crop state when December loan processing blocks time", () => {
    const land = useGameStore.getState().lands[0];
    const crop = prepareCropDevelopment(
      prepareCropDevelopment(createCrop("rice", land.id, 1, 12), "plowing")!.crop,
      "planting",
    )!.crop;
    const loan = createLoan(land, 1);
    useGameStore.setState({
      quarter: 4,
      month: 12,
      crops: [crop],
      loans: [loan],
    });
    const crops = useGameStore.getState().crops;

    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState().month).toBe(12);
    expect(useGameStore.getState().crops).toBe(crops);
  });

  it("retains prior-year planting history when starting another crop", () => {
    const records: CropPlantingRecord[] = Array.from({ length: 4 }, (_, index) => ({
      cropId: `crop-${index}`,
      kind: "rice",
      landId: "land-1",
      year: 1,
    }));
    const land = useGameStore.getState().lands[0];
    useGameStore.setState({
      year: 2,
      quarter: 1,
      month: 1,
      cropPlantingHistory: records,
    });

    expect(useGameStore.getState().startCropPlanting("rice", land.id)).toBe(true);
    expect(useGameStore.getState().cropPlantingHistory).toHaveLength(5);
  });
});
