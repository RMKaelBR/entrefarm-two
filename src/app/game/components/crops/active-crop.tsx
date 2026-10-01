"use client";

import type { CashCrop } from "@/game-data/crop/crop-types";
import { CashCropComponent } from "./cash-crop";

export function ActiveCrop({ crop }: { crop: CashCrop }) {
    switch (crop.kind) {
        case "rice":
        case "corn":
            return <CashCropComponent crop={crop} />;
        default: {
            const unhandled: never = crop;
            throw new Error(`Unsupported crop: ${String(unhandled)}`);
        }
    }
}
