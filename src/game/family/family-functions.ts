import { Child, GENDERS } from "@/game/types";
import { addTimeToken } from "../time/advance-time";
import { nearlyAdult } from "./utils/family-constants";
import { assignRandomProfession } from "./education-functions";

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
    isStudying: true,
  };

  return {
    ...initialChild,
    education: null,
    isStudying: true,
    ...overrides,
  };
};

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
  if (!child.education || !child.isStudying) return child;

  const progress = Math.min(child.education.progress + 1, child.education.progressMax);

  const finished = progress >= child.education.progressMax;

  return {
    ...child,
    education: { ...child.education, progress },
    isStudying: finished ? false : child.isStudying,
    // optional: when finished, stage update / unlock laborProfession / etc
  };
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
  childrenAgeTicker,
  updateChildById,
}
