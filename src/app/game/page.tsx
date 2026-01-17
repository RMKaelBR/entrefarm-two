'use client';

import { useGameStore } from "@/features/state/useGameStore";

const GamePage = () => {
    const nextDay = useGameStore((state) => state.nextDay);
    const resetAll = useGameStore((state) => state.resetAll);
    return (
        <div className="space-y-3">
            <div>Game Page</div>
            <button className="rounded-xl border px-4 py-2 hover:bg-black/5" onClick={nextDay}>
                Next Day
            </button>
            <button className="rounded-xl border px-4 py-2 m-2 hover:bg-black/5" onClick={resetAll}>
                Reset All
            </button>
        </div>
    )

};

export default GamePage;