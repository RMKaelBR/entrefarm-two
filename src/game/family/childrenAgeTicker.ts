import { Child } from "@/game/types";
import { addTimeToken } from "../time/advanceTime";

/**
 * Ages children by 1 maturity tick (quarterly).
 * Pure function: no Zustand, no side-effects.
 */
export function childrenAgeTicker(children: Child[]): Child[] {
  return children.map((child) => {
    if (child.stage !== "child") return child;

    const agedUpChild = addTimeToken(child, 1);
    const matured = agedUpChild.timeTokens >= agedUpChild.timeTokensMax;

    return {
      ...agedUpChild,
      stage: matured ? "adult_child" : "child",
    };
  });
}
