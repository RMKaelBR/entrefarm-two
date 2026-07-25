import {
    childNeedsQuarterlyTuitionDecision,
    pauseChildEducation,
    resumeChildEducation,
    setChildLaborJob,
} from '@/game-data/family/education-functions';
import { createChild, updateChildById } from '@/game-data/family/family-functions';
import { addCurrency, subCurrency } from '@/game-data/money/calculate-money';
import { advanceWorldTime, advanceYear } from '@/game-data/time/advance-time';
import { Child, GameState, QUARTERLY_TUITION_COST } from '@/game-data/types';
import { create } from 'zustand';

const initialState = {
  year: 1,
  quarter: 1,
  month: 1,
  wallet: { gold: 0, silver: 0 },
  bank: { gold: 0, silver: 0 },
  children: [createChild(), createChild()],
} as const;

export const isQuarterStart = (month: number) => month % 3 === 1;

export const getTimeAdvanceBlockReason = (
    state: Pick<GameState, 'month' | 'children'>
) => {
    if (!isQuarterStart(state.month)) return null;

    const unresolved = state.children.some(childNeedsQuarterlyTuitionDecision);
    return unresolved
        ? 'Resolve tuition for each adult child before advancing time.'
        : null;
};

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
    advanceWorldTime: () => set((state) => {
        const blockReason = getTimeAdvanceBlockReason(state);
        if (blockReason) return state;

        return {
            ...state,
            ...advanceWorldTime(state)
        };
    }),

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
        set((state) => {
            const child = state.children.find((item) => item.id === childId);
            if (!child || child.stage !== 'adult_child' || !child.education) {
                return state;
            }

            const alreadyPaid = child.tuitionCommittedForQuarter === true;
            if (!alreadyPaid && !isQuarterStart(state.month)) {
                return state;
            }

            if (alreadyPaid) {
                return {
                    ...state,
                    children: updateChildById(state.children, childId, resumeChildEducation),
                };
            }

            const nextWallet = subCurrency(state.wallet, QUARTERLY_TUITION_COST);
            const canAfford = nextWallet.gold >= 0 && nextWallet.silver >= 0;
            if (!canAfford) return state;

            return {
                ...state,
                wallet: nextWallet,
                children: updateChildById(state.children, childId, (child) => ({
                    ...resumeChildEducation(child),
                    tuitionCommittedForQuarter: true,
                }))
            };
        });
    },
    setChildLaborJob: (childId: Child["id"], laborJob: Child["laborJob"]) => {
        set((state) => ({
            ...state,
            children: updateChildById(state.children, childId, (c) =>
                setChildLaborJob(c, laborJob)
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
