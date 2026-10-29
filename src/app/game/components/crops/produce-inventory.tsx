"use client";
import { totalProduceYield } from "@/game-data/crop/produce-functions";

import { formatYield } from "@/game-data/yield/calculate-yield";

import { useGameStore } from "@/state/game-state";
import { IMPLEMENTED_CROPS } from "@/game-data/crop/crop-definitions";

export function ProduceInventory() {
    const inventory = useGameStore((state) => state.produceInventory);

    return (
        <section className="space-y-2 border bg-white p-4">
            <h2 className="font-semibold">Held produce</h2>
            <dl>
                {IMPLEMENTED_CROPS.map((definition) => (
                    <div key={definition.kind}>
                        <dt><span aria-hidden="true">{definition.emoji}</span> {definition.name}</dt>
                        <dd>{formatYield(totalProduceYield(inventory, definition.kind))} produce units</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
