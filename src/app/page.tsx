'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [continueClicked, setContinueClicked] = useState(false);

  const handleNewGame = () => {
    router.push('/game');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Entrefarm</h1>
        <p className="text-sm opacity-80">
          A browser-based entrepreneurship farming game.
        </p>

        <div className="grid gap-2">
          <button className="rounded-xl border px-4 py-2 hover:bg-black/5" onClick={handleNewGame}>
            New Game
          </button>
          <button className="rounded-xl border px-4 py-2 hover:bg-black/5" onClick={() => setContinueClicked(true)}>
            Continue
          </button>
          {continueClicked && (
            <div className="pt-2 text-sm opacity-80">
              No save file found. <button className="font-medium underline" onClick={handleNewGame}>Start a new game</button> instead.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
