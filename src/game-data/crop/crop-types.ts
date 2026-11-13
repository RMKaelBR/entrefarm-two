import type { Yield } from "../yield/yield-types";
import type { Land } from "../land/land-types";
import type { Currency, TokenTrack } from "../types";

export type CashCropKind = "rice" | "corn";
export type LongTermCropKind = "coconut" | "fruit" | "rubber" | "coffee" | "cacao";
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

export type ProduceInventory = Record<CropKind, Yield>;

// Shared funding API covers cash-crop and long-term development.
export type CropDevelopmentTask = CashCropDevelopmentTask | CoconutDevelopmentTask | FruitDevelopmentTask | RubberDevelopmentTask | CoffeeDevelopmentTask | CacaoDevelopmentTask;
export type CropProductionTask = RiceProductionTask | CornProductionTask | CoconutProductionTask | FruitProductionTask | RubberProductionTask | CoffeeProductionTask | CacaoProductionTask;

export type CropProductionPayment<TCrop extends Crop = Crop> = {
  crop: TCrop;
  cost: Currency;
  collectedProduce?: {
    kind: TCrop["kind"];
    quantity: Yield;
  };
};

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
  lastHarvest: { outcome: "collected" | "lost"; quantity: Yield } | null;
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
  lastHarvest: { outcome: "collected" | "lost"; quantity: Yield } | null;
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

export type RubberDevelopmentTask = LongTermDevelopmentTask;
export type RubberProductionTask = "tapping" | "hauling";
export type RubberYoung = LongTermDevelopmentTrack;
export type RubberBatch = {
  quantity: Yield;
  advancesSinceTapping: 0 | 1;
};
export type RubberAdult = {
  phase: "adult";
  progress: number;
  payments: MaintenancePayment<100 | 75>[];
  previousCyclePenalty: boolean;
  lateTappingAvailable: boolean;
  batch: RubberBatch | null;
} & (
  | { stage: "growing"; cycleMonth: 1 | 2; tappedOnTime: false; fromOverflow: false }
  | { stage: "ready"; cycleMonth: 3; tappedOnTime: boolean;
      fromOverflow: boolean; yieldResult: "high" | "low" }
);
export type RubberCrop = {
  kind: "rubber";
  id: string;
  landId: Land["id"];
  startedYear: number;
  startedMonth: number;
  purchasing: { seedlingPaid: true };
  lifecycle: LongTermPreparation | RubberYoung | RubberAdult;
};

export type CropCalendar = { year: number; month: number };
export type CoffeeDevelopmentTask = LongTermDevelopmentTask;
export type CoffeeProductionTask = "harvesting" | "dryingMilling" | "hauling";
export type CoffeeYoung = LongTermDevelopmentTrack;
export type CoffeeOpportunity = {
  harvestYear: number;
  yieldResult: "high" | "low";
  expiresAt: number;
};
export type CoffeeBatch = {
  quantity: Yield;
  harvestedAt: number;
  expiresAt: number;
} & ({ stage: "harvested" } | { stage: "driedMilled" });
export type CoffeeAdult = {
  phase: "adult";
  calendar: CropCalendar;
  progress: number;
  firstEligibleHarvestYear: number;
  cycleHarvestYear: number;
  payments: MaintenancePayment<100 | 75 | 50 | 25>[];
  opportunity: CoffeeOpportunity | null;
  batch: CoffeeBatch | null;
};
export type CoffeeCrop = {
  kind: "coffee";
  id: string;
  landId: Land["id"];
  startedYear: number;
  startedMonth: number;
  purchasing: { seedlingPaid: true };
  lifecycle: LongTermPreparation | CoffeeYoung | CoffeeAdult;
};

export type CacaoDevelopmentTask = LongTermDevelopmentTask;
export type CacaoProductionTask = "harvesting" | "splittingFermentingDrying" | "hauling";
export type CacaoYoung = LongTermDevelopmentTrack;
export type CacaoOpportunity = {
  readyAt: number;
  expiresAt: number;
  yieldResult: "high" | "low";
};
export type CacaoBatch = {
  quantity: Yield;
  harvestedAt: number;
  expiresAt: number;
  stage: "harvested" | "processed";
};
export type CacaoAdult = {
  phase: "adult";
  stage: "growing" | "ready";
  adultMonth: number;
  cycleMonth: number;
  progress: number;
  nextReadyAt: number;
  payments: MaintenancePayment<100 | 75>[];
  opportunity: CacaoOpportunity | null;
  batch: CacaoBatch | null;
};
export type CacaoCrop = {
  kind: "cacao";
  id: string;
  landId: Land["id"];
  startedYear: number;
  startedMonth: number;
  purchasing: { seedlingPaid: true };
  lifecycle: LongTermPreparation | CacaoYoung | CacaoAdult;
};

export type Crop = CashCrop | CoconutCrop | FruitCrop | RubberCrop | CoffeeCrop | CacaoCrop;
