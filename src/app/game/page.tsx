'use client';

import { useGameStore } from "@/state/useGameStore";
import { useState } from "react";

const GamePage = () => {
    const nextYear = useGameStore((state) => state.nextYear);
    const nextMonth = useGameStore((state) => state.nextMonth);
    const resetAll = useGameStore((state) => state.resetAll);

    const earn = useGameStore((state) => state.earn);
    const spend = useGameStore((state) => state.spend);
    const deposit = useGameStore((state) => state.deposit);
    const withdraw = useGameStore((state) => state.withdraw);

    const [gold, setGold] = useState(0);
    const [silver, setSilver] = useState(0);

    const amount = { gold: Number(gold), silver: Number(silver) };
    return (
        <div className="space-y-3">
            <div>Game Page</div>
            <button className="rounded-xl border px-4 py-2 m-2 hover:bg-black/5" onClick={nextYear}>
                Next Year
            </button>
            <button className="rounded-xl border px-4 py-2 m-2 hover:bg-black/5" onClick={nextMonth}>
                Next Month

            </button>
            <button className="rounded-xl border px-4 py-2 m-2 hover:bg-black/5" onClick={resetAll}>
                Reset All
            </button>

            {/* Currency Inputs */}
            <div className="flex gap-2 items-end">
                <div className="flex flex-col">
                <label className="text-sm">Gold</label>
                <input
                    type="number"
                    min={0}
                    value={gold}
                    onChange={(e) => setGold(e.target.valueAsNumber || 0)}
                    className="w-24 rounded border px-2 py-1"
                />
                </div>

                <div className="flex flex-col">
                <label className="text-sm">Silver</label>
                <input
                    type="number"
                    min={0}
                    value={silver}
                    onChange={(e) => setSilver(e.target.valueAsNumber || 0)}
                    className="w-24 rounded border px-2 py-1"
                />
                </div>
            </div>

            {/* Currency Actions */}
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <button
                    className="rounded-xl border px-4 py-2 hover:bg-black/5"
                    onClick={() => earn(amount)}
                    >
                    Add to Wallet
                    </button>

                    <button
                    className="rounded-xl border px-4 py-2 hover:bg-black/5"
                    onClick={() => {
                        const ok = spend(amount);
                        if (!ok) {
                        alert('Not enough funds!');
                        }

                    }}
                    >
                    Spend from Wallet
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        className="rounded-xl border px-4 py-2 hover:bg-black/5"
                        onClick={() => {
                            const ok = spend(amount);
                            if (!ok) {
                            alert('Not enough funds!');
                            }
                            deposit(amount)
                        }}
                    >
                    Deposit to Bank
                    </button>

                    <button
                    className="rounded-xl border px-4 py-2 hover:bg-black/5"
                    onClick={() => {
                        const ok = withdraw(amount);
                        if (!ok) {
                        alert('Not enough funds!');
                        }
                        earn(amount)
                    }}
                    >
                    Withdraw from Bank
                    </button>
                </div>
            </div>
        </div>
    )

};

export default GamePage;