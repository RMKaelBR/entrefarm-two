export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Entrefarm</h1>
        <p className="text-sm opacity-80">
          A browser-based entrepreneurship farming game.
        </p>

        <div className="grid gap-2">
          <button className="rounded-xl border px-4 py-2 hover:bg-black/5">
            New Game
          </button>
          <button className="rounded-xl border px-4 py-2 hover:bg-black/5">
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
