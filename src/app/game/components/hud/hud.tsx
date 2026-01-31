'use client';

import { useGameStore } from '@/state/game-state';
import { ChildrenComponent } from '../children';

export default function Hud() {
    const year = useGameStore((state) => state.year);
    const quarter = useGameStore((state) => state.quarter);
    const month = useGameStore((state) => state.month);

    const wallet = useGameStore((state) => state.wallet);
    const bank = useGameStore((state) => state.bank);

    return (
        <div>
            <article className="font-semibold">🌾 Entrefarm Game Header</article>
            <article className="text-md flex gap-4">
                <span>Year: {year}</span>
                <span>Quarter: {quarter}</span>
                <span>Month: {month}</span>

                <div>Wallet: {wallet.gold}<span className="text-sm">🟡</span> {wallet.silver}<span className="text-sm">🔘</span></div>
                <div>Bank: {bank.gold}<span className="text-sm">🟡</span> {bank.silver}<span className="text-sm">🔘</span></div>
            </article>
            <article>
                <ChildrenComponent />
            </article>
        </div>
    );
}