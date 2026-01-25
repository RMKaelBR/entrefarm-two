'use client';

import type { ReactNode } from "react";
import { useGameStore } from "@/state/useGameStore";

export default function GameLayout({children}: {children: ReactNode;}) {
    const year = useGameStore((state) => state.year);
    const quarter = useGameStore((state) => state.quarter);
    const month = useGameStore((state) => state.month);

    const wallet = useGameStore((state) => state.wallet);
    const bank = useGameStore((state) => state.bank);
    const childCards = useGameStore((state) => state.children);

    return (
        <div className="min-h-screen bg-green-100 flex flex-col">
            <header>
                <article className="font-semibold">🌾 Entrefarm Game Header</article>
                <article className="text-md flex gap-4">
                    <span>Year: {year}</span>
                    <span>Quarter: {quarter}</span>
                    <span>Month: {month}</span>

                    <div>Wallet: {wallet.gold}<span className="text-sm">🟡</span> {wallet.silver}<span className="text-sm">🔘</span></div>
                    <div>Bank: {bank.gold}<span className="text-sm">🟡</span> {bank.silver}<span className="text-sm">🔘</span></div>
                </article>
                <article>
                    <div className="font-semibold mt-2">Children:</div>
                    <div className="flex gap-4">
                        {childCards.map((child) => (
                            <div key={child.id} className="border rounded p-2 bg-white">
                                <div>ID: {child.id}</div>
                                <div>Name: {child.name || "Unnamed"}</div>
                                <div>Stage: {child.stage}</div>
                                <div>Maturity: {child.timeTokens} / {child.timeTokensMax}</div>
                            </div>
                        ))}
                    </div>
                </article>
            </header>
            
            <main className="flex-1 p-4">
                {children}
            </main>
        </div>
    );
}