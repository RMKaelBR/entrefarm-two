import { Child, GENDERS } from "@/game-data/types";
import { addTimeToken } from "../time/advance-time";
import { nearlyAdult } from "./utils/family-constants";
import {
  assignRandomProfession,
  canAdvanceEducationThisQuarter,
  resetQuarterTuition,
} from "./education-functions";

const makeId = () => crypto.randomUUID();

const createChild = (overrides?: Partial<Child>): Child => {
  const initialChild: Child = {
    id: makeId(),
    stage: "child",
    gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
    profession: undefined,
    laborJob: null,
    maturity: nearlyAdult,
    education: null,
    isStudying: false,
  };

  return {
    ...initialChild,
    ...overrides,
  };
};

function prepareChildForHousehold(child: Child): Child {
  if (child.stage !== "adult_child") return child;

  const hasActiveEducation =
    child.education
    && child.education.progress < child.education.progressMax;

  if (hasActiveEducation) {
    return {
      ...child,
      tuitionDecision: "pending",
      isStudying: false,
    };
  }

  return {
    ...child,
    tuitionDecision: undefined,
    isStudying: false,
  };
}

/**
 * Ages children by 1 maturity tick (quarterly).
 * Pure function: no Zustand, no side-effects.
 */
function childrenAgeTicker(children: Child[]): Child[] {
  return children.map((child) => {
    if (child.stage !== "child") return child;

    const agedUpChild = addTimeToken(child.maturity, 1);
    const matured = agedUpChild.timeTokens >= agedUpChild.timeTokensMax;

    if (matured) {
      return assignRandomProfession(
        { ...child, maturity: agedUpChild, stage: "adult_child" }
      );
    }

    return {
      ...child,
      maturity: agedUpChild,
    };
  });
}

export function advanceEducationQuarter(child: Child): Child {
  if (!canAdvanceEducationThisQuarter(child)) return resetQuarterTuition(child);

  const education = child.education!;
  const progress = Math.min(education.progress + 1, education.progressMax);
  const finished = progress >= education.progressMax;
  const progressed = {
    ...child,
    education: { ...education, progress },
  };

  return finished
    ? { ...progressed, tuitionDecision: undefined, isStudying: false }
    : resetQuarterTuition(progressed);
}

export function tickChildrenQuarter(children: Child[]): Child[] {
  // 1) Age everyone
  const aged = childrenAgeTicker(children);

  // 2) Advance education for those eligible
  return aged.map(advanceEducationQuarter);
}


function updateChildById(
  children: Child[],
  id: Child["id"],
  updater: (child: Child) => Child
): Child[] {
  return children.map((c) =>
    c.id === id ? updater(c) : c
  );
}

export {
  createChild,
  prepareChildForHousehold,
  childrenAgeTicker,
  updateChildById,
}
