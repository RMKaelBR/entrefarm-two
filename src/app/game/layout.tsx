'use client';

import type { ReactNode } from "react";
import { useGameStore } from "@/features/state/useGameStore";

export default function GameLayout({children}: {children: ReactNode;}) {
    const day = useGameStore((state) => state.day);
    const cash = useGameStore((state) => state.cash);
    const energy = useGameStore((state) => state.energy);

    return (
        <div className="min-h-screen bg-green-100 flex flex-col">
            <header>
                <div className="font-semibold">🌾 Entrefarm Game Header</div>
                <div className="text-sm flex gap-4">
                    <span>Day: {day}</span>
                    <span>Cash: {cash}</span>
                    <span>Energy: {energy}</span>
                </div>
            </header>
            
            <main className="flex-1 p-4">
                {children}
            </main>
        </div>
    );
}