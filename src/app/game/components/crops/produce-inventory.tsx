"use client";

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
                        <dt>{definition.name}</dt>
                        <dd>{inventory.filter((item) => item.crop === definition.kind).length} tokens</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
