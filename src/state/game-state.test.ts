import { beforeEach, describe, expect, it } from "vitest";
import { createLand } from "@/game-data/land/land-functions";
import type { Child } from "@/game-data/types";
import { useGameStore } from "./game-state";

const makeAdultChild = (
  overrides: Partial<Child> = {}
): Child => ({
  id: "adult-1",
  stage: "adult_child",
  gender: "female",
  maturity: { timeTokens: 20, timeTokensMax: 20 },
  profession: "agriculturist",
  education: { progress: 1, progressMax: 4 },
  tuitionDecision: "pending",
  isStudying: false,
  laborJob: null,
  ...overrides,
});

describe("adult-child education store actions", () => {
  beforeEach(() => {
    useGameStore.setState({
      year: 1,
      quarter: 1,
      month: 1,
      wallet: { gold: 8, silver: 0 },
      bank: { gold: 0, silver: 0 },
      children: [makeAdultChild()],
    });
  });

  it("retains tuition and prevents another same-quarter payment after pause", () => {
    useGameStore.getState().payChildTuition("adult-1");
    expect(useGameStore.getState().wallet).toEqual({ gold: 4, silver: 0 });

    useGameStore.getState().pauseChildEducation("adult-1");
    expect(useGameStore.getState()).toMatchObject({
      wallet: { gold: 4, silver: 0 },
      children: [{
        tuitionDecision: "paid",
        isStudying: false,
      }],
    });

    useGameStore.getState().payChildTuition("adult-1");
    expect(useGameStore.getState()).toMatchObject({
      wallet: { gold: 4, silver: 0 },
      children: [{
        tuitionDecision: "paid",
        isStudying: false,
      }],
    });
  });

  it("does not charge when tuition is unaffordable", () => {
    useGameStore.setState({ wallet: { gold: 3, silver: 9 } });

    useGameStore.getState().payChildTuition("adult-1");

    expect(useGameStore.getState()).toMatchObject({
      wallet: { gold: 3, silver: 9 },
      children: [{
        tuitionDecision: "pending",
        isStudying: false,
      }],
    });
  });

  it("does not charge for an invalid child id", () => {
    useGameStore.getState().payChildTuition("missing");

    expect(useGameStore.getState().wallet).toEqual({ gold: 8, silver: 0 });
  });

  it("allows manual labor only after studies stop", () => {
    useGameStore.getState().payChildTuition("adult-1");
    useGameStore.getState().setChildLaborJob("adult-1", "laborer");
    expect(useGameStore.getState().children[0].laborJob).toBeNull();

    useGameStore.getState().pauseChildEducation("adult-1");
    useGameStore.getState().setChildLaborJob("adult-1", "laborer");
    expect(useGameStore.getState().children[0].laborJob).toBe("laborer");
  });

  it("allows a fresh paid start after the next-quarter reset", () => {
    useGameStore.setState({
      month: 3,
      quarter: 1,
      wallet: { gold: 4, silver: 0 },
      children: [makeAdultChild({
        tuitionDecision: "paid",
        isStudying: false,
      })],
    });

    useGameStore.getState().advanceWorldTime();

    const resetChild = useGameStore.getState().children[0];
    expect(resetChild.education?.progress).toBe(1);
    expect(resetChild.tuitionDecision).toBe("pending");
    expect(resetChild.isStudying).toBe(false);

    useGameStore.getState().payChildTuition(resetChild.id);
    expect(useGameStore.getState()).toMatchObject({
      wallet: { gold: 0, silver: 0 },
      children: [{
        tuitionDecision: "paid",
        isStudying: true,
      }],
    });
  });

  it("awards progress when study remains uninterrupted through quarter end", () => {
    useGameStore.setState({
      month: 3,
      quarter: 1,
      children: [makeAdultChild({
        tuitionDecision: "paid",
        isStudying: true,
      })],
    });

    useGameStore.getState().advanceWorldTime();

    expect(useGameStore.getState().children[0]).toMatchObject({
      education: { progress: 2, progressMax: 4 },
      tuitionDecision: "pending",
      isStudying: false,
    });
  });
});

describe("owned land store actions", () => {
  beforeEach(() => {
    useGameStore.setState({
      wallet: { gold: 0, silver: 0 },
      land: createLand("forestedPlains"),
    });
  });

  it("starts and resets with a fresh Forested Plains parcel", () => {
    const initialLand = useGameStore.getState().land;

    expect(initialLand).toEqual(createLand("forestedPlains"));

    useGameStore.setState({
      wallet: { gold: 20, silver: 0 },
      land: createLand("riverlands"),
    });
    const developedLand = useGameStore.getState().land;

    useGameStore.getState().resetAll();

    const resetState = useGameStore.getState();
    expect(resetState.wallet).toEqual({ gold: 0, silver: 0 });
    expect(resetState.land).toEqual(createLand("forestedPlains"));
    expect(resetState.land).not.toBe(initialLand);
    expect(resetState.land).not.toBe(developedLand);
  });

  it("pays to clear and then irrigate the owned parcel", () => {
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });

    expect(useGameStore.getState().clearOwnedLand()).toBe(true);
    expect(useGameStore.getState()).toMatchObject({
      wallet: { gold: 10, silver: 0 },
      land: {
        origin: "forestedPlains",
        isCleared: true,
        isIrrigated: false,
        currentValue: { gold: 40, silver: 0 },
      },
    });

    expect(useGameStore.getState().irrigateOwnedLand()).toBe(true);
    expect(useGameStore.getState()).toMatchObject({
      wallet: { gold: 0, silver: 0 },
      land: {
        origin: "forestedPlains",
        isCleared: true,
        isIrrigated: true,
        currentValue: { gold: 50, silver: 0 },
      },
    });
  });

  it("rejects clearing when funds are insufficient without changing state", () => {
    useGameStore.setState({ wallet: { gold: 9, silver: 9 } });
    const before = useGameStore.getState();

    expect(before.clearOwnedLand()).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().land).toBe(before.land);
  });

  it("rejects irrigation before clearing without changing state", () => {
    const before = useGameStore.getState();

    expect(before.irrigateOwnedLand()).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().land).toBe(before.land);
  });

  it("rejects repeated clearing without charging again", () => {
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    expect(useGameStore.getState().clearOwnedLand()).toBe(true);
    const before = useGameStore.getState();

    expect(before.clearOwnedLand()).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().land).toBe(before.land);
  });

  it("rejects irrigation when funds are insufficient after clearing", () => {
    useGameStore.setState({ wallet: { gold: 10, silver: 0 } });
    expect(useGameStore.getState().clearOwnedLand()).toBe(true);
    const before = useGameStore.getState();

    expect(before.irrigateOwnedLand()).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().land).toBe(before.land);
  });

  it("rejects development actions on fully developed land without charging", () => {
    useGameStore.setState({
      wallet: { gold: 10, silver: 0 },
      land: createLand("riverlands"),
    });
    const before = useGameStore.getState();

    expect(before.clearOwnedLand()).toBe(false);
    expect(before.irrigateOwnedLand()).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().land).toBe(before.land);
  });
});
