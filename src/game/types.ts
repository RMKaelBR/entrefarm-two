export type GameState = {
    year: number;
    quarter: number;
    month: number;
    wallet: Currency;
    bank: Currency;
    children: Child[];
    advanceWorldTime: () => void;
    nextYear: () => void;
    earn: (amount: Currency) => void;
    spend: (amount: Currency) => boolean;
    deposit: (amount: Currency) => void;
    withdraw: (amount: Currency) => boolean;
    initFamily: () => void;
    addChild: (child: Child) => void;
    removeChild: (childId: Child["id"]) => void;
    pauseChildEducation: (childId: Child["id"]) => void;
    resumeChildEducation: (childId: Child["id"]) => void;
    setChildLaborJob: (childId: Child["id"], laborJob: Child["laborJob"]) => void;
    resetAll: () => void;
};

export type Currency = {
  gold: number;   // whole gold
  silver: number; // 0..9 ideally (normalized)
};

type PersonStage = "child" | "adult_child";
export const GENDERS = ["male", "female"] as const;
export type Gender = typeof GENDERS[number];

export const PROFESSIONS = {
  civil_engineer: { label: "Civil Engineer", progressMax: 5 },
  mechanical_engineer: { label: "Mechanical Engineer", progressMax: 5 },
  agricultural_engineer: { label: "Agricultural Engineer", progressMax: 5 },
  engineer: { label: "Engineer", progressMax: 5 },
  doctor: { label: "Doctor", progressMax: 8 },
  lawyer: { label: "Lawyer", progressMax: 8 },
  agriculturist: { label: "Agriculturist", progressMax: 4 },
  financial_analyst: { label: "Financial Analyst", progressMax: 4 },
} as const;

export type ProfessionCode = keyof typeof PROFESSIONS;

export type ProfessionDef = (typeof PROFESSIONS)[ProfessionCode];

export const LABOR_PROFESSIONS = [
  "employee",
  "laborer",
  "coop_employee"
] as const;

export type LaborProfession = typeof LABOR_PROFESSIONS[number];

export type Child = {
  id: string;
  name?: string;
  stage: PersonStage;
  gender: Gender;
  isStudying?: boolean;
  profession?: ProfessionCode;
  laborJob?: LaborProfession | null;
  
  maturity: TokenTrack;
  education?: EducationProgressTrack | null;
};

export type EducationProgressTrack = {
  progress: number;
  progressMax: number;
};

export type TokenTrack = { timeTokens: number; timeTokensMax: number };
