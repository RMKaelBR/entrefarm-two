import type { Land } from "../land/land-types";
import type { TokenTrack } from "../types";

export type CropKind = "rice";
export type RiceDevelopmentTask = "plowing" | "planting";
export type RiceProductionTask = "harvesting" | "hauling" | "drying";

export type RiceCrop = {
  id: string;
  kind: "rice";
  landId: Land["id"];
  startedYear: number;
  startedMonth: number;
  purchasing: { seedsPaid: true };
  development: Record<RiceDevelopmentTask, boolean>;
  maintenancePaid: number;
  maturity: TokenTrack;
  production: Record<RiceProductionTask, boolean>;
};

export type CropPlantingRecord = {
  cropId: RiceCrop["id"];
  kind: RiceCrop["kind"];
  landId: Land["id"];
  year: number;
};

export type ProduceToken = {
  id: string;
  crop: CropKind;
};
