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