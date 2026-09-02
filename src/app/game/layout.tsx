'use client';

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/state/game-state";
import Hud from "./components/hud/hud";

export default function GameLayout({children}: {children: ReactNode;}) {
    const router = useRouter();
    const hasActiveGame = useGameStore((state) => state.hasActiveGame);

    useEffect(() => {
        // Future persistence: wait for save loading before redirecting.
        if (!hasActiveGame) router.replace('/');
    }, [hasActiveGame, router]);

    if (!hasActiveGame) return null;

    return (
        <div className="min-h-screen bg-green-100 flex flex-col">
            <header>
                <Hud />
            </header>
            
            <main className="flex-1 p-4">
                {children}
            </main>
        </div>
    );
}
