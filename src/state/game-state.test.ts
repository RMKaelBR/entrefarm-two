import { beforeEach, describe, expect, it } from "vitest";
import { clearLand, createLand } from "@/game-data/land/land-functions";
import { LAND_ORIGINS } from "@/game-data/land/land-types";
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

describe("game lifecycle", () => {
  beforeEach(() => {
    useGameStore.setState({
      year: 1,
      quarter: 1,
      month: 1,
      wallet: { gold: 20, silver: 0 },
      bank: { gold: 0, silver: 0 },
      lands: [],
      loans: [],
      children: [],
      hasActiveGame: false,
    });
  });

  it("boots with deterministic data and no active game", () => {
    expect(useGameStore.getState()).toMatchObject({
      year: 1,
      quarter: 1,
      month: 1,
      wallet: { gold: 20, silver: 0 },
      bank: { gold: 0, silver: 0 },
      lands: [],
      loans: [],
      children: [],
      hasActiveGame: false,
    });
  });

  it("starts a complete active game with 20 gold", () => {
    useGameStore.getState().startNewGame();
    const state = useGameStore.getState();

    expect(state).toMatchObject({
      year: 1,
      quarter: 1,
      month: 1,
      wallet: { gold: 20, silver: 0 },
      bank: { gold: 0, silver: 0 },
      hasActiveGame: true,
    });
    expect(state.lands.map((land) => land.origin)).toEqual(LAND_ORIGINS);
    expect(state.children).toHaveLength(2);
    expect(new Set(state.lands.map((land) => land.id)).size).toBe(LAND_ORIGINS.length);
    expect(new Set(state.children.map((child) => child.id)).size).toBe(2);
  });

  it("replaces randomized entities when starting another game", () => {
    useGameStore.getState().startNewGame();
    const firstLandIds = useGameStore.getState().lands.map((land) => land.id);
    const firstChildIds = useGameStore.getState().children.map((child) => child.id);

    useGameStore.setState({
      year: 7,
      wallet: { gold: 3, silver: 4 },
    });
    useGameStore.getState().startNewGame();
    const state = useGameStore.getState();

    expect(state).toMatchObject({
      year: 1,
      wallet: { gold: 20, silver: 0 },
      hasActiveGame: true,
    });
    expect(state.lands.map((land) => land.id)).not.toEqual(firstLandIds);
    expect(state.children.map((child) => child.id)).not.toEqual(firstChildIds);
  });
});

describe("adult-child education store actions", () => {
  beforeEach(() => {
    useGameStore.setState({
      year: 1,
      quarter: 1,
      month: 1,
      wallet: { gold: 8, silver: 0 },
      bank: { gold: 0, silver: 0 },
      lands: LAND_ORIGINS.map(createLand),
      loans: [],
      children: [makeAdultChild()],
      hasActiveGame: true,
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
      lands: [createLand("forestedPlains")],
      loans: [],
      hasActiveGame: true,
    });
  });

  it("resets to an active new game with fresh lands and children", () => {
    const beforeReset = LAND_ORIGINS.map(createLand);
    const beforeChildren = [makeAdultChild({ id: "before-1" })];

    useGameStore.setState({
      wallet: { gold: 20, silver: 0 },
      lands: beforeReset,
      children: beforeChildren,
      hasActiveGame: true,
    });

    useGameStore.getState().resetAll();

    const resetState = useGameStore.getState();
    expect(resetState.wallet).toEqual({ gold: 20, silver: 0 });
    expect(resetState.hasActiveGame).toBe(true);
    expect(resetState.lands.map((land) => land.origin)).toEqual(LAND_ORIGINS);
    expect(new Set(resetState.lands.map((land) => land.id)).size).toBe(LAND_ORIGINS.length);
    expect(resetState.lands.map((land) => land.id)).not.toEqual(
      beforeReset.map((land) => land.id),
    );
    expect(resetState.children).toHaveLength(2);
    expect(resetState.children.map((child) => child.id)).not.toEqual(
      beforeChildren.map((child) => child.id),
    );

    resetState.lands.forEach((land, index) => {
      const expected = createLand(LAND_ORIGINS[index]);
      expect(land).toEqual({ ...expected, id: expect.any(String) });
      expect(land.currentValue).not.toBe(expected.currentValue);
    });
  });

  it("clears and irrigates only the targeted parcel", () => {
    const target = createLand("forestedPlains");
    const sameOriginNeighbor = createLand("forestedPlains");
    const originalLands = [target, sameOriginNeighbor];
    useGameStore.setState({
      wallet: { gold: 20, silver: 0 },
      lands: originalLands,
    });

    expect(useGameStore.getState().clearOwnedLand(target.id)).toBe(true);
    const afterClearing = useGameStore.getState();
    expect(afterClearing.wallet).toEqual({ gold: 10, silver: 0 });
    expect(afterClearing.lands).not.toBe(originalLands);
    expect(afterClearing.lands[0]).not.toBe(target);
    expect(afterClearing.lands[0]).toMatchObject({
      id: target.id,
      isCleared: true,
      isIrrigated: false,
      currentValue: { gold: 40, silver: 0 },
    });
    expect(afterClearing.lands[1]).toBe(sameOriginNeighbor);

    expect(useGameStore.getState().irrigateOwnedLand(target.id)).toBe(true);
    const afterIrrigation = useGameStore.getState();
    expect(afterIrrigation.wallet).toEqual({ gold: 0, silver: 0 });
    expect(afterIrrigation.lands).not.toBe(afterClearing.lands);
    expect(afterIrrigation.lands[0]).not.toBe(afterClearing.lands[0]);
    expect(afterIrrigation.lands[0]).toMatchObject({
      id: target.id,
      isCleared: true,
      isIrrigated: true,
      currentValue: { gold: 50, silver: 0 },
    });
    expect(afterIrrigation.lands[1]).toBe(sameOriginNeighbor);
  });

  it("rejects an unknown parcel id without changing state", () => {
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    const before = useGameStore.getState();

    expect(before.clearOwnedLand("missing")).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().lands).toBe(before.lands);
  });

  it("rejects clearing when funds are insufficient without changing state", () => {
    useGameStore.setState({ wallet: { gold: 9, silver: 9 } });
    const before = useGameStore.getState();
    const landId = before.lands[0].id;

    expect(before.clearOwnedLand(landId)).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().lands).toBe(before.lands);
  });

  it("rejects repeated clearing without changing collection references", () => {
    useGameStore.setState({ wallet: { gold: 20, silver: 0 } });
    const landId = useGameStore.getState().lands[0].id;
    expect(useGameStore.getState().clearOwnedLand(landId)).toBe(true);
    const before = useGameStore.getState();

    expect(before.clearOwnedLand(landId)).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().lands).toBe(before.lands);
  });

  it("rejects irrigation when funds are insufficient without changing state", () => {
    const cleared = clearLand(createLand("forestedPlains"));
    useGameStore.setState({
      wallet: { gold: 9, silver: 9 },
      lands: [cleared],
    });
    const before = useGameStore.getState();

    expect(before.irrigateOwnedLand(cleared.id)).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().lands).toBe(before.lands);
  });

  it.each([
    ["foothills", false, false],
    ["forestedPlains", true, false],
    ["plains", false, true],
    ["riverlands", false, false],
  ] as const)(
    "enforces development eligibility for %s",
    (origin, canClear, canIrrigate) => {
      const clearTarget = createLand(origin);
      useGameStore.setState({
        wallet: { gold: 20, silver: 0 },
        lands: [clearTarget],
      });
      expect(useGameStore.getState().clearOwnedLand(clearTarget.id)).toBe(canClear);

      const irrigationTarget = createLand(origin);
      useGameStore.setState({
        wallet: { gold: 20, silver: 0 },
        lands: [irrigationTarget],
      });
      expect(useGameStore.getState().irrigateOwnedLand(irrigationTarget.id)).toBe(canIrrigate);
    },
  );
});

describe("land loan store actions", () => {
  beforeEach(() => {
    useGameStore.setState({
      year: 1,
      quarter: 4,
      month: 12,
      wallet: { gold: 0, silver: 0 },
      bank: { gold: 0, silver: 0 },
      lands: [createLand("plains"), createLand("riverlands")],
      loans: [],
      children: [],
      hasActiveGame: true,
    });
  });

  it("originates exactly one loan per parcel and credits the wallet atomically", () => {
    const landId = useGameStore.getState().lands[0].id;

    expect(useGameStore.getState().takeLandLoan(landId)).toBe(true);
    const borrowed = useGameStore.getState();
    expect(borrowed.wallet).toEqual({ gold: 20, silver: 0 });
    expect(borrowed.loans).toHaveLength(1);
    expect(borrowed.loans[0]).toMatchObject({
      collateralLandId: landId,
      outstandingBalance: { gold: 20, silver: 0 },
      originatedYear: 1,
      status: "active",
    });

    const wallet = borrowed.wallet;
    const loans = borrowed.loans;
    expect(borrowed.takeLandLoan(landId)).toBe(false);
    expect(useGameStore.getState().wallet).toBe(wallet);
    expect(useGameStore.getState().loans).toBe(loans);
  });

  it("accrues once on the first December attempt without ticking time or children", () => {
    const landId = useGameStore.getState().lands[0].id;
    useGameStore.getState().takeLandLoan(landId);
    const children = useGameStore.getState().children;

    useGameStore.getState().advanceWorldTime();
    const pending = useGameStore.getState();
    expect(pending).toMatchObject({ year: 1, quarter: 4, month: 12 });
    expect(pending.children).toBe(children);
    expect(pending.loans[0]).toMatchObject({
      outstandingBalance: { gold: 24, silver: 0 },
      lastAccruedYear: 1,
      status: "pending",
    });

    const loan = pending.loans[0];
    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState().loans[0]).toBe(loan);
    expect(useGameStore.getState().month).toBe(12);
  });

  it("rejects unaffordable repayment and removes an affordable repaid loan", () => {
    const landId = useGameStore.getState().lands[0].id;
    useGameStore.getState().takeLandLoan(landId);
    useGameStore.getState().advanceWorldTime();
    useGameStore.setState({ wallet: { gold: 23, silver: 9 } });
    const before = useGameStore.getState();

    expect(before.repayLoan(before.loans[0].id)).toBe(false);
    expect(useGameStore.getState().wallet).toBe(before.wallet);
    expect(useGameStore.getState().loans).toBe(before.loans);

    useGameStore.setState({ wallet: { gold: 24, silver: 0 } });
    expect(useGameStore.getState().repayLoan(before.loans[0].id)).toBe(true);
    expect(useGameStore.getState()).toMatchObject({ wallet: { gold: 0, silver: 0 }, loans: [] });
  });

  it("carries over, advances to January, and compounds again next year", () => {
    const landId = useGameStore.getState().lands[0].id;
    useGameStore.getState().takeLandLoan(landId);
    useGameStore.getState().advanceWorldTime();
    const pending = useGameStore.getState().loans[0];

    expect(useGameStore.getState().carryOverLoan(pending.id)).toBe(true);
    const carried = useGameStore.getState().loans[0];
    expect(carried).toMatchObject({
      outstandingBalance: { gold: 24, silver: 0 },
      lastAccruedYear: 1,
      status: "active",
    });

    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState()).toMatchObject({ year: 2, quarter: 1, month: 1 });
    useGameStore.setState({ quarter: 4, month: 12 });
    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState().loans[0]).toMatchObject({
      outstandingBalance: { gold: 28, silver: 8 },
      lastAccruedYear: 2,
      status: "pending",
    });
  });

  it("keeps time blocked until every loan is resolved", () => {
    const [first, second] = useGameStore.getState().lands;
    useGameStore.getState().takeLandLoan(first.id);
    useGameStore.getState().takeLandLoan(second.id);
    useGameStore.getState().advanceWorldTime();
    const [firstLoan, secondLoan] = useGameStore.getState().loans;

    useGameStore.getState().carryOverLoan(firstLoan.id);
    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState().month).toBe(12);
    useGameStore.getState().carryOverLoan(secondLoan.id);
    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState()).toMatchObject({ year: 2, month: 1 });
  });

  it("keeps tuition ahead of loan accrual", () => {
    const landId = useGameStore.getState().lands[0].id;
    useGameStore.getState().takeLandLoan(landId);
    useGameStore.setState({ children: [makeAdultChild()] });
    const loan = useGameStore.getState().loans[0];

    useGameStore.getState().advanceWorldTime();
    expect(useGameStore.getState().loans[0]).toBe(loan);
    expect(useGameStore.getState().loans[0].status).toBe("active");
  });

  it("reset starts a new game without loans", () => {
    useGameStore.getState().takeLandLoan(useGameStore.getState().lands[0].id);
    useGameStore.getState().resetAll();
    expect(useGameStore.getState().loans).toEqual([]);
  });
});
