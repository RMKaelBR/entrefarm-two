import { Child, ProfessionCode, PROFESSIONS } from "../types";

export function pauseChildEducation(child: Child): Child {
  if (
    !hasActiveEducationTrack(child)
    || child.tuitionDecision !== "paid"
    || child.isStudying !== true
  ) {
    return child;
  }

  return {
    ...child,
    isStudying: false,
  };
}

export function hasActiveEducationTrack(child: Child): boolean {
  const education = child.education;
  return child.stage === "adult_child"
    && Boolean(education)
    && education!.progress < education!.progressMax;
}

export function childNeedsQuarterlyTuitionDecision(child: Child): boolean {
  return hasActiveEducationTrack(child)
    && child.tuitionDecision === "pending";
}

export function canAdvanceEducationThisQuarter(child: Child): boolean {
  return hasActiveEducationTrack(child)
    && child.isStudying === true
    && child.tuitionDecision === "paid";
}

export function resetQuarterTuition(child: Child): Child {
  if (!hasActiveEducationTrack(child)) return child;

  return {
    ...child,
    tuitionDecision: "pending",
    isStudying: false,
  };
}

export function markChildTuitionPaid(child: Child): Child {
  if (!childNeedsQuarterlyTuitionDecision(child)) return child;
  return {
    ...child,
    tuitionDecision: "paid",
    isStudying: true,
  };
}

export function optOutChildEducation(child: Child): Child {
  if (!childNeedsQuarterlyTuitionDecision(child)) return child;
  return {
    ...child,
    tuitionDecision: "opted_out",
    isStudying: false,
  };
}

export function assignProfession(child: Child, profession: ProfessionCode): Child {
  const professionDef = PROFESSIONS[profession];
  return {
    ...child,
    profession,
    education: {
      progress: 0,
      progressMax: professionDef.progressMax,
    },
    isStudying: false,
    tuitionDecision: "pending",
  };
}

export function assignRandomProfession(child: Child): Child {
  const professionCodes = Object.keys(PROFESSIONS) as ProfessionCode[];
  const randomProfession =
    professionCodes[Math.floor(Math.random() * professionCodes.length)];
  return assignProfession(child, randomProfession);
}

export function canPerformManualLabor(child: Child): boolean {
  return child.stage === "adult_child"
    && child.isStudying !== true;
}

export function setChildLaborJob(
  child: Child,
  laborJob: Child["laborJob"]
): Child {
  if (!canPerformManualLabor(child)) return child;

  return {
    ...child,
    laborJob,
  };
}
