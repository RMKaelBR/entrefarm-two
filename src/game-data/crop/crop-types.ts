import type { Land } from "../land/land-types";
import type { TokenTrack } from "../types";

export type CashCropKind = "rice" | "corn";
export type CropKind = CashCropKind | "coconut";
export type CashCropDevelopmentTask = "plowing" | "planting";
export type RiceProductionTask = "harvesting" | "hauling" | "drying";

export type CashCropBase = {
  id: string;
  landId: Land["id"];
  startedYear: number;
  startedMonth: number;
  purchasing: { seedsPaid: true };
  development: Record<CashCropDevelopmentTask, boolean>;
  maintenancePaid: number;
  maturity: TokenTrack;
};

export type RiceCrop = CashCropBase & {
  kind: "rice";
  irrigationBonus: boolean | null;
  production: Record<RiceProductionTask, boolean>;
};

export type CornProductionTask = "picking" | "shelling" | "hauling" | "drying";
export type CornCrop = CashCropBase & {
  kind: "corn";
  production: Record<CornProductionTask, boolean>;
};
export type CashCrop = RiceCrop | CornCrop;

export type CropPlantingRecord = {
  cropId: Crop["id"];
  kind: CropKind;
  landId: Land["id"];
  year: number;
};

export type ProduceToken = {
  id: string;
  crop: CropKind;
};

export type CropDevelopmentTask = CashCropDevelopmentTask | CoconutDevelopmentTask;
export type CropProductionTask = RiceProductionTask | CornProductionTask | CoconutProductionTask;

export type CoconutDevelopmentTask = "clearing" | "hauling" | "planting";
export type CoconutProductionTask = "climbingPiling" | "husking" | "hauling";
export type CoconutYoung = {
  phase: "young";
  cropMonth: number;
  regularTokens: number;
  bonusTokens: number;
  payments: { cropMonth: number; pointHundredths: 100 | 90 | 75 }[];
};
export type CoconutAdult = {
  phase: "adult";
  fmPaidMonth: 1 | 2 | null;
  production: Record<CoconutProductionTask, boolean>;
  lastHarvest: { outcome: "collected" | "lost"; quantity: number } | null;
} & (
  | { stage: "resting" }
  | { stage: "growing"; cycleMonth: 1 | 2 }
  | { stage: "ready"; cycleMonth: 3; yieldResult: "high" | "low"; readyAge: 0 | 1 | 2; fromOverflow: boolean }
);
export type CoconutCrop = {
  kind: "coconut";
  id: string;
  landId: Land["id"];
  startedYear: number;
  startedMonth: number;
  purchasing: { seedlingPaid: true };
  lifecycle:
    | { phase: "preparation"; development: Record<CoconutDevelopmentTask, boolean> }
    | CoconutYoung
    | CoconutAdult;
};
export type Crop = CashCrop | CoconutCrop;
