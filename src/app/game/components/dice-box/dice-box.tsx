'use client';

import type DiceBox from '@3d-dice/dice-box';
import { useEffect, useRef, useState } from 'react';

type DiceBoxStatus =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'rolling' }
  | { kind: 'error'; message: string };

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'The dice roller could not be loaded.';

export function DiceRoller() {
  const diceBoxRef = useRef<DiceBox | null>(null);
  const mountedRef = useRef(false);
  const [status, setStatus] = useState<DiceBoxStatus>({ kind: 'loading' });
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;

    async function initialize() {
      try {
        const { default: DiceBoxConstructor } = await import('@3d-dice/dice-box');

        if (cancelled || diceBoxRef.current) return;

        const diceBox = new DiceBoxConstructor({
          container: '#dice-box',
          assetPath: '/assets/',
          theme: 'smooth-pip',
          scale: 9,
        });

        await diceBox.init();

        if (cancelled) {
          diceBox.clear();
          return;
        }

        diceBoxRef.current = diceBox;
        setStatus({ kind: 'ready' });
      } catch (error: unknown) {
        if (!cancelled) {
          setStatus({ kind: 'error', message: getErrorMessage(error) });
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      diceBoxRef.current?.clear();
      diceBoxRef.current = null;
    };
  }, []);

  const roll = async () => {
    const diceBox = diceBoxRef.current;
    if (!diceBox || status.kind !== 'ready') return;

    setResult(null);
    setStatus({ kind: 'rolling' });

    try {
      const results = await diceBox.roll('1dpip');
      if (!mountedRef.current) return;

      setResult(results[0]?.value ?? null);
      setStatus({ kind: 'ready' });
    } catch (error: unknown) {
      if (mountedRef.current) {
        setStatus({ kind: 'error', message: getErrorMessage(error) });
      }
    }
  };

  const isBusy = status.kind === 'loading' || status.kind === 'rolling';

  return (
    <section className="w-full max-w-60 space-y-3" aria-labelledby="dice-roller-title">
      <div className="flex items-center gap-3">
        <h2 id="dice-roller-title" className="text-lg font-semibold">
          Dice Roller
        </h2>
        {result !== null && (
          <output className="rounded-lg bg-white px-3 font-semibold" aria-live="polite">
            Result: {result}
          </output>
        )}
      </div>

      <div
        id="dice-box"
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-green-300 bg-green-50 [&>canvas]:h-full [&>canvas]:w-full"
      />

      <button
        type="button"
        onClick={() => void roll()}
        disabled={status.kind !== 'ready'}
        className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status.kind === 'loading'
          ? 'Loading dice…'
          : status.kind === 'rolling'
            ? 'Rolling…'
            : 'Roll 1d6'}
      </button>

      {isBusy && (
        <p className="text-sm text-gray-600" role="status">
          {status.kind === 'loading' ? 'Preparing the dice roller.' : 'The die is rolling.'}
        </p>
      )}

      {status.kind === 'error' && (
        <p className="text-sm text-red-700" role="alert">
          Dice roller error: {status.message} Refresh the page to try again.
        </p>
      )}
    </section>
  );
}
