import type { Land } from "../land/land-types";
import type { TokenTrack } from "../types";

export type CropKind = "rice" | "corn";
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

export type CornDevelopmentTask = RiceDevelopmentTask;
export type CornProductionTask = "picking" | "shelling" | "hauling" | "drying";
export type CornCrop = Omit<RiceCrop, "kind" | "production"> & {
  kind: "corn";
  production: Record<CornProductionTask, boolean>;
};
export type CashCrop = RiceCrop | CornCrop;

export type CropPlantingRecord = {
  cropId: CashCrop["id"];
  kind: CropKind;
  landId: Land["id"];
  year: number;
};

export type ProduceToken = {
  id: string;
  crop: CropKind;
};

export type CropDevelopmentTask = RiceDevelopmentTask | CornDevelopmentTask;
export type CropProductionTask = RiceProductionTask | CornProductionTask;
