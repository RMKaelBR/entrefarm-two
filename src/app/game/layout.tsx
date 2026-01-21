'use client';

import type { ReactNode } from "react";
import { useGameStore } from "@/state/useGameStore";

export default function GameLayout({children}: {children: ReactNode;}) {
    const year = useGameStore((state) => state.year);
    const month = useGameStore((state) => state.month);

    const wallet = useGameStore((state) => state.wallet);
    const bank = useGameStore((state) => state.bank);
    const energy = useGameStore((state) => state.energy);

    return (
        <div className="min-h-screen bg-green-100 flex flex-col">
            <header>
                <div className="font-semibold">🌾 Entrefarm Game Header</div>
                <div className="text-md flex gap-4">
                    <span>Year: {year}</span>
                    <span>Month: {month}</span>

                    <div>Wallet: {wallet.gold}<span className="text-sm">🟡</span> {wallet.silver}<span className="text-sm">🔘</span></div>
                    <div>Bank: {bank.gold}<span className="text-sm">🟡</span> {bank.silver}<span className="text-sm">🔘</span></div>
                    <span>Energy: {energy}</span>
                </div>
            </header>
            
            <main className="flex-1 p-4">
                {children}
            </main>
        </div>
    );
}