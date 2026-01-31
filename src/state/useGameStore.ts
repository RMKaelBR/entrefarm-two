import { childrenAgeTicker } from '@/game/family/childrenAgeTicker';
import { addCurrency, subCurrency } from '@/game/money/calculateMoney';
import { advanceTime, advanceYear } from '@/game/time/advanceTime';
import { GameState, Child } from '@/game/types';
import { create } from 'zustand';

const makeId = () => crypto.randomUUID();

const createChild = (overrides?: Partial<Child>): Child => ({
  id: makeId(),
  stage: "child",
  timeTokens: 0,
  timeTokensMax: 8, // example: 8 quarters = 2 years; tweak later
  ...overrides,
});

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
    advanceTime: () => set((state) => {
        const nextTime = advanceTime(state);
        const isQuarterEnd = state.month % 3 === 0;

        return {
            ...state,
            ...nextTime,
            children: isQuarterEnd ? childrenAgeTicker(state.children) : state.children,

        }
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
            children: [...state.children, createChild(child)],
        }));
    },
    removeChild: (childId: string) => {
        set((state) => ({
            children: state.children.filter((c) => c.id !== childId),
        }));
    },

    // RESET ALL
    resetAll: () =>
        set(() => ({
            ...initialState,
            children: [createChild(), createChild()], // reset with new children
        })),
}));