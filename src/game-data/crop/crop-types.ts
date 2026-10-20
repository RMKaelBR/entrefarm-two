import type { Land } from "../land/land-types";
import type { Currency, TokenTrack } from "../types";

export type CashCropKind = "rice" | "corn";
export type LongTermCropKind = "coconut" | "fruit";
export type CropKind = CashCropKind | LongTermCropKind;
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

// Shared funding API covers cash-crop and long-term development.
export type CropDevelopmentTask = CashCropDevelopmentTask | CoconutDevelopmentTask | FruitDevelopmentTask;
export type CropProductionTask = RiceProductionTask | CornProductionTask | CoconutProductionTask | FruitProductionTask;

export type LongTermDevelopmentTask = "siteClearing" | "seedlingHauling" | "planting";
export type LongTermPreparation = {
  phase: "development";
  development: Record<LongTermDevelopmentTask, boolean>;
};
export type LongTermCropDefinition = {
  seedlingCost: Currency;
  developmentCosts: Record<LongTermDevelopmentTask, Currency>;
  developmentTokens: number;
  developmentMaintenanceSlots: number;
  developmentMaintenancePeriodMonths: number;
  monthsPerGrowthToken: number;
  maintenanceCost: Currency;
  productionTokens: number;
  productionMaintenanceSlots: number;
  readonly productionCycleMonths: number;
};
export type CoconutDevelopmentTask = LongTermDevelopmentTask;
export type CoconutProductionTask = "climbingPiling" | "husking" | "hauling";
export type MaintenanceWeight = 100 | 90 | 75 | 50 | 25;
export type MaintenancePayment<W extends MaintenanceWeight = MaintenanceWeight> = {
  // Young: crop month; adult: production cycle month.
  month: number;
  weightHundredths: W;
};
export type LongTermDevelopmentTrack = {
  phase: "young";
  cropMonth: number;
  regularTokens: number;
  bonusTokens: number;
  payments: MaintenancePayment<100 | 90 | 75>[];
};
export type CoconutYoung = LongTermDevelopmentTrack;
export type CoconutAdult = {
  phase: "adult";
  progress: number;
  payments: MaintenancePayment<100 | 75>[];
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
    | LongTermPreparation
    | CoconutYoung
    | CoconutAdult;
};

export type FruitDevelopmentTask = LongTermDevelopmentTask;
export type FruitProductionTask = "harvesting" | "hauling";
export type FruitYoung = LongTermDevelopmentTrack;
export type FruitAdult = {
  phase: "adult";
  progress: number;
  payments: MaintenancePayment<100 | 75 | 50 | 25>[];
  production: Record<FruitProductionTask, boolean>;
  lastHarvest: { outcome: "collected" | "lost"; quantity: number } | null;
} & (
  | { stage: "resting" }
  | { stage: "growing"; cycleMonth: number }
  | { stage: "ready"; cycleMonth: number; yieldResult: "high" | "low"; readyAge: 0 | 1 }
);
export type FruitCrop = {
  kind: "fruit";
  id: string;
  landId: Land["id"];
  startedYear: number;
  startedMonth: number;
  purchasing: { seedlingPaid: true };
  lifecycle:
    | LongTermPreparation
    | FruitYoung
    | FruitAdult;
};

export type Crop = CashCrop | CoconutCrop | FruitCrop;
