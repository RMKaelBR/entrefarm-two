"use client";

import { useId, useState } from "react";
import type { Land } from "@/game-data/land/land-types";
import type { CropKind } from "@/game-data/crop/crop-types";
import { CROP_DEFINITIONS, IMPLEMENTED_CROPS } from "@/game-data/crop/crop-definitions";
import {
    getCropPlacementBlockReason, hasWholeGold, isCropKind,
} from "@/game-data/crop/crop-functions";
import { useGameStore } from "@/state/game-state";
import { Button } from "../button";
import { ActiveCrop } from "./active-crop";

export function ParcelCropPanel({ land }: { land: Land }) {
    const crop = useGameStore((state) =>
        state.crops.find((item) => item.landId === land.id));

    if (!crop) return <CropChooser key={land.id} land={land} />;

    return (
        <div className="space-y-2">
            <p className="text-sm text-stone-600">
                This parcel is occupied. Another crop cannot be planted while it is occupied.
            </p>
            <ActiveCrop key={crop.id} crop={crop} />
        </div>
    );
}

function CropChooser({ land }: { land: Land }) {
    const [kind, setKind] = useState<CropKind | "">("");
    const selectId = useId();
    const statusId = `${selectId}-status`;
    const wallet = useGameStore((state) => state.wallet);
    const startCropPlanting = useGameStore((state) => state.startCropPlanting);
    const definition = kind ? CROP_DEFINITIONS[kind] : null;
    const allBlocked = IMPLEMENTED_CROPS.every((item) =>
        item.getPlacementBlockReason(land) !== null);
    const initialReasons = allBlocked
        ? [...new Set(IMPLEMENTED_CROPS.map((item) =>
            item.getPlacementBlockReason(land)))].join(" ")
        : null;
    const reason = kind && definition
        ? getCropPlacementBlockReason(kind, land)
            ?? (!hasWholeGold(wallet, definition.purchaseCost)
                ? `${definition.purchaseCost.gold} whole gold is required to start this crop.`
                : null)
        : initialReasons || "Choose a crop before purchasing planting material.";

    return (
        <div className="space-y-2">
            <label htmlFor={selectId} className="block font-medium">Choose a crop</label>
            <select
                id={selectId}
                value={kind}
                aria-describedby={reason ? statusId : undefined}
                className="w-full rounded border p-2"
                onChange={(event) => {
                    const value = event.target.value;
                    setKind(isCropKind(value) ? value : "");
                }}
            >
                <option value="">Select a crop</option>
                {IMPLEMENTED_CROPS.map((item) => (
                    <option key={item.kind} value={item.kind}>{item.name}</option>
                ))}
            </select>
            <Button
                label={definition
                    ? `Start ${definition.name}: ${definition.purchaseLabel} (${definition.purchaseCost.gold} Gold)`
                    : "Start Planting"}
                disabled={reason !== null}
                onClick={() => {
                    if (kind && reason === null) startCropPlanting(kind, land.id);
                }}
            />
            {reason && <p id={statusId} className="text-sm text-stone-600">{reason}</p>}
        </div>
    );
}
