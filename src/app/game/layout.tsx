'use client';

import type { ReactNode } from "react";
import Hud from "./components/hud/hud";

export default function GameLayout({children}: {children: ReactNode;}) {

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