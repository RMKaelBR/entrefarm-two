import { Child, ProfessionCode, PROFESSIONS } from "../types";

export function pauseChildEducation(child: Child): Child {
  if (child.stage !== "adult_child") return child;
  return {
    ...child,
    isStudying: false,
  };
}

export function resumeChildEducation(child: Child): Child {
  if (child.stage !== "adult_child") return child;
  return {
    ...child,
    isStudying: true,
  };
}

export function childNeedsQuarterlyTuitionDecision(child: Child): boolean {
  return child.stage === "adult_child" 
    && Boolean(child.education)
    && !child.tuitionCommittedForQuarter;
}

export function canAdvanceEducationThisQuarter(child: Child): boolean {
  return Boolean(child.education)
    && child.isStudying === true
    && child.tuitionCommittedForQuarter === true;
}

export function resetQuarterTuition(child: Child): Child {
  if (child.stage !== "adult_child") return child;

  return {
    ...child,
    tuitionCommittedForQuarter: false,
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
    isStudying: true,
    tuitionCommittedForQuarter: false,
  };
}

export function assignRandomProfession(child: Child): Child {
  const professionCodes = Object.keys(PROFESSIONS) as ProfessionCode[];
  const randomProfession =
    professionCodes[Math.floor(Math.random() * professionCodes.length)];
  return assignProfession(child, randomProfession);
}

export function setChildLaborJob(
  child: Child,
  laborJob: Child["laborJob"]
): Child {
  if (child.stage !== "adult_child") return child;
  return {
    ...child,
    laborJob,
  };
}
