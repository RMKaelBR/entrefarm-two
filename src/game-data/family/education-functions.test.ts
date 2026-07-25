import { describe, expect, it } from "vitest";
import type { Child } from "../types";
import {
  canPerformManualLabor,
  pauseChildEducation,
  setChildLaborJob,
} from "./education-functions";
import { advanceEducationQuarter } from "./family-functions";

const makeAdultChild = (
  overrides: Partial<Child> = {}
): Child => ({
  id: "adult-1",
  stage: "adult_child",
  gender: "female",
  maturity: { timeTokens: 20, timeTokensMax: 20 },
  profession: "agriculturist",
  education: { progress: 1, progressMax: 4 },
  tuitionDecision: "paid",
  isStudying: true,
  laborJob: null,
  ...overrides,
});

describe("adult-child education transitions", () => {
  it("awards progress for uninterrupted paid study", () => {
    const next = advanceEducationQuarter(makeAdultChild());

    expect(next.education?.progress).toBe(2);
    expect(next.tuitionDecision).toBe("pending");
    expect(next.isStudying).toBe(false);
  });

  it("forfeits all quarterly progress after pausing", () => {
    const paused = pauseChildEducation(makeAdultChild());
    const next = advanceEducationQuarter(paused);

    expect(paused).toMatchObject({
      tuitionDecision: "paid",
      isStudying: false,
    });
    expect(next.education?.progress).toBe(1);
    expect(next.tuitionDecision).toBe("pending");
    expect(next.isStudying).toBe(false);
  });

  it("does not mutate an already withdrawn child", () => {
    const withdrawn = makeAdultChild({ isStudying: false });

    expect(pauseChildEducation(withdrawn)).toBe(withdrawn);
  });

  it("does not pause an unpaid or completed education track", () => {
    const pending = makeAdultChild({
      tuitionDecision: "pending",
      isStudying: false,
    });
    const completed = makeAdultChild({
      education: { progress: 4, progressMax: 4 },
    });

    expect(pauseChildEducation(pending)).toBe(pending);
    expect(pauseChildEducation(completed)).toBe(completed);
  });

  it("finishes uninterrupted education without a new tuition decision", () => {
    const next = advanceEducationQuarter(
      makeAdultChild({ education: { progress: 3, progressMax: 4 } })
    );

    expect(next.education?.progress).toBe(4);
    expect(next.tuitionDecision).toBeUndefined();
    expect(next.isStudying).toBe(false);
  });
});

describe("manual labor eligibility", () => {
  it("allows labor for withdrawn and opted-out adult children", () => {
    const withdrawn = makeAdultChild({ isStudying: false });
    const optedOut = makeAdultChild({
      tuitionDecision: "opted_out",
      isStudying: false,
    });

    expect(canPerformManualLabor(withdrawn)).toBe(true);
    expect(canPerformManualLabor(optedOut)).toBe(true);
    expect(setChildLaborJob(withdrawn, "laborer").laborJob).toBe("laborer");
    expect(setChildLaborJob(optedOut, "employee").laborJob).toBe("employee");
  });

  it("rejects labor for a studying adult child", () => {
    const studying = makeAdultChild();

    expect(canPerformManualLabor(studying)).toBe(false);
    expect(setChildLaborJob(studying, "laborer")).toBe(studying);
  });

  it("rejects labor for a child-stage person", () => {
    const child = makeAdultChild({
      stage: "child",
      education: null,
      profession: undefined,
      tuitionDecision: undefined,
      isStudying: false,
    });

    expect(canPerformManualLabor(child)).toBe(false);
    expect(setChildLaborJob(child, "laborer")).toBe(child);
  });
});
