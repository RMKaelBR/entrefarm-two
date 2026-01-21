import { addCurrency, subCurrency } from '@/game/money/calculateMoney';
import { advanceMonth, advanceYear } from '@/game/time/advanceTime';
import { GameState } from '@/game/types';
import { create } from 'zustand';

export const useGameStore = create<GameState>((set, get) => ({
    year: 1,
    month: 1,
    energy: 50,
    wallet: { gold: 0, silver: 0 },
    bank: { gold: 0, silver: 0 },
    earn: (amount) => set((state) => ({
        wallet: addCurrency(state.wallet, amount),
    })),
    spend: (amount) => {
        const { wallet } = get();
        const next = subCurrency(wallet, amount);

        if (next.gold < 0 || (next.gold === 0 && next.silver < 0)) return false;

        set({ wallet: next });
        return true;
    },
    deposit: (amount) => set((state) => ({
        bank: addCurrency(state.bank, amount),
    })),
    withdraw: (amount) => {
        const { bank } = get();
        const next = subCurrency(bank, amount);

        if (next.gold < 0 || (next.gold === 0 && next.silver < 0)) return false;

        set({ bank: next });
        return true;
    },
    nextYear: () =>
        set((state) => ({
            ...state,
            ...advanceYear(state),
        })),
    nextMonth: () =>
        set((state) => ({
            ...state,
            ...advanceMonth(state),
        })),
    resetAll: () =>
        set(() => ({
            year: 1,
            month: 1,
            day: 1,
            cash: 100,
            energy: 50,
        })),
}));