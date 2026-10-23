"use client";

import { RubberCropComponent } from "./rubber-crop";
import { FruitCropComponent } from "./fruit-crop";

import type { Crop } from "@/game-data/crop/crop-types";
import { CoconutCropComponent } from "./coconut-crop";
import { CashCropComponent } from "./cash-crop";

export function ActiveCrop({ crop }: { crop: Crop }) {
    switch (crop.kind) {
        case "rubber": return <RubberCropComponent crop={crop} />;
        case "fruit": return <FruitCropComponent crop={crop} />;
        case "coconut": return <CoconutCropComponent crop={crop} />;
        case "rice":
        case "corn":
            return <CashCropComponent crop={crop} />;
        default: {
            const unhandled: never = crop;
            throw new Error(`Unsupported crop: ${String(unhandled)}`);
        }
    }
}
