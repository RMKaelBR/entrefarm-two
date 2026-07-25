'use client';

import { QUARTERLY_TUITION_COST } from '@/game-data/types';
import { getTimeAdvanceBlockReason, useGameStore } from '@/state/game-state';
import { ChildrenComponent } from '../children';

export default function Hud() {
    const year = useGameStore((state) => state.year);
    const quarter = useGameStore((state) => state.quarter);
    const month = useGameStore((state) => state.month);

    const wallet = useGameStore((state) => state.wallet);
    const bank = useGameStore((state) => state.bank);
    const tuitionBlockReason = useGameStore((state) => getTimeAdvanceBlockReason(state));

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
            {tuitionBlockReason && (
                <>
                    <article className="text-sm text-stone-700">
                        Tuition is {QUARTERLY_TUITION_COST.gold} gold per eligible child,
                        or you may opt out for this quarter.
                    </article>
                    <article className="text-sm text-red-700">{tuitionBlockReason}</article>
                </>
            )}
            <article>
                <ChildrenComponent />
            </article>
        </div>
    );
}
