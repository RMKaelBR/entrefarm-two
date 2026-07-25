import { beforeEach, describe, expect, it } from "vitest";
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
