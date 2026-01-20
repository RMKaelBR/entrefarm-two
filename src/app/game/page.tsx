'use client';

import { useGameStore } from "@/state/useGameStore";

const GamePage = () => {
    const nextYear = useGameStore((state) => state.nextYear);
    const nextMonth = useGameStore((state) => state.nextMonth);

    const resetAll = useGameStore((state) => state.resetAll);
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
        </div>
    )

};

export default GamePage;