import { pauseChildEducation, resumeChildEducation, setChildLaborProfession } from '@/game/family/education-functions';
import { createChild, updateChildById } from '@/game/family/family-functions';
import { addCurrency, subCurrency } from '@/game/money/calculate-money';
import { advanceWorldTime, advanceYear } from '@/game/time/advance-time';
import { GameState, Child } from '@/game/types';
import { create } from 'zustand';

const initialState = {
  year: 1,
  quarter: 1,
  month: 1,
  wallet: { gold: 0, silver: 0 },
  bank: { gold: 0, silver: 0 },
  children: [createChild(), createChild()],
} as const;

export const useGameStore = create<GameState>((set, get) => ({
    ...initialState,

    // TIME (state)
    year: 1,
    quarter: 1,
    month: 1,

    // MONEY
    wallet: { gold: 0, silver: 0 },
    bank: { gold: 0, silver: 0 },

    // FAMILY
    children: [createChild(), createChild()],

    // TIME (actions)
    advanceWorldTime: () => set((state) => ({
            ...state,
            ...advanceWorldTime(state)
        })),

    nextYear: () =>
        set((state) => ({
            ...state,
            ...advanceYear(state),
        })),

    // MONEY (actions)
    earn: (amount) => set((state) => ({
        ...state,
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
        ...state,
        bank: addCurrency(state.bank, amount),
    })),
    withdraw: (amount) => {
        const { bank } = get();
        const next = subCurrency(bank, amount);

        if (next.gold < 0 || (next.gold === 0 && next.silver < 0)) return false;

        set({ bank: next });
        return true;
    },

    // FAMILY (actions)
    initFamily: () => {
        set(() => ({
          children: [createChild(), createChild()],
        }));
    },
    addChild: (child: Child) => {
        set((state) => ({
            ...state,
            children: [...state.children, createChild(child)],
        }));
    },
    removeChild: (childId: string) => {
        set((state) => ({
            ...state,
            children: state.children.filter((c) => c.id !== childId),
        }));
    },
    pauseChildEducation: (childId: Child["id"]) => {
        set((state) => ({
            ...state,
            children: updateChildById(state.children, childId, pauseChildEducation)
        }));
    },
    resumeChildEducation: (childId: Child["id"]) => {
        set((state) => ({
            ...state,
            children: updateChildById(state.children, childId, resumeChildEducation)
        }));
    },
    setChildLaborProfession: (childId: Child["id"], laborProfession: Child["laborProfession"]) => {
        set((state) => ({
            ...state,
            children: updateChildById(state.children, childId, (c) =>
                setChildLaborProfession(c, laborProfession)
            ),
        }));
    },

    // RESET ALL
    resetAll: () =>
        set(() => ({
            ...initialState,
            children: [createChild(), createChild()], // reset with new children
        })),
}));