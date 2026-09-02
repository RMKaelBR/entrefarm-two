import { create } from 'zustand';
import {
    childNeedsQuarterlyTuitionDecision,
    markChildTuitionPaid,
    optOutChildEducation as transitionChildEducationOptOut,
    pauseChildEducation,
    setChildLaborJob,
} from '@/game-data/family/education-functions';
import {
    createChild,
    prepareChildForHousehold,
    updateChildById,
} from '@/game-data/family/family-functions';
import { addCurrency, subCurrency } from '@/game-data/money/calculate-money';
import { advanceWorldTime, advanceYear } from '@/game-data/time/advance-time';
import { Child, GameState, QUARTERLY_TUITION_COST } from '@/game-data/types';
import { LAND_ORIGINS } from '@/game-data/land/land-types';
import {
    CLEARING_COST_GOLD,
    IRRIGATION_COST_GOLD,
} from '@/game-data/land/land-data';
import {
    canClearLand,
    canIrrigateLand,
    clearLand,
    irrigateLand,
    createLand,
} from '@/game-data/land/land-functions';

const createInitialLands = () =>
    LAND_ORIGINS.map((origin) => createLand(origin));

const initialState: Pick<
    GameState,
    | 'year'
    | 'quarter'
    | 'month'
    | 'wallet'
    | 'bank'
    | 'lands'
    | 'children'
    | 'hasActiveGame'
> = {
    year: 1,
    quarter: 1,
    month: 1,
    wallet: { gold: 20, silver: 0 },
    bank: { gold: 0, silver: 0 },
    lands: [],
    children: [],
    hasActiveGame: false,
};

export const getTimeAdvanceBlockReason = (
    state: Pick<GameState, 'children'>
) => {
    const unresolved = state.children.some(childNeedsQuarterlyTuitionDecision);
    return unresolved
        ? 'Pay tuition or opt out for each eligible adult child before advancing time.'
        : null;
};

export const useGameStore = create<GameState>((set, get) => ({
    ...initialState,

    // GAME LIFECYCLE
    startNewGame: () =>
        set({
            ...initialState,
            wallet: { ...initialState.wallet },
            bank: { ...initialState.bank },
            lands: createInitialLands(),
            children: [createChild(), createChild()],
            hasActiveGame: true,
        }),

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
            children: [...state.children, prepareChildForHousehold(child)],
        }));
    },
    removeChild: (childId: string) => {
        set((state) => ({
            ...state,
            children: state.children.filter((c) => c.id !== childId),
        }));
    },
    payChildTuition: (childId: Child["id"]) => {
        set((state) => {
            const child = state.children.find((item) => item.id === childId);
            if (!child || !childNeedsQuarterlyTuitionDecision(child)) {
                return state;
            }

            const nextWallet = subCurrency(state.wallet, QUARTERLY_TUITION_COST);
            if (nextWallet.gold < 0 || nextWallet.silver < 0) return state;

            return {
                ...state,
                wallet: nextWallet,
                children: updateChildById(
                    state.children,
                    childId,
                    markChildTuitionPaid
                ),
            };
        });
    },
    optOutChildEducation: (childId: Child["id"]) => {
        set((state) => ({
            ...state,
            children: updateChildById(
                state.children,
                childId,
                transitionChildEducationOptOut
            ),
        }));
    },
    pauseChildEducation: (childId: Child["id"]) => {
        set((state) => ({
            ...state,
            children: updateChildById(state.children, childId, pauseChildEducation)
        }));
    },
    setChildLaborJob: (childId: Child["id"], laborJob: Child["laborJob"]) => {
        set((state) => ({
            ...state,
            children: updateChildById(state.children, childId, (c) =>
                setChildLaborJob(c, laborJob)
            ),
        }));
    },

    // LAND (actions)
    clearOwnedLand: (landId) => {
        let committed = false;

        set((state) => {
            const target = state.lands.find((land) => land.id === landId);
            if (!target || !canClearLand(target)) return state;

            const nextWallet = subCurrency(state.wallet, CLEARING_COST_GOLD);
            if (nextWallet.gold < 0 || nextWallet.silver < 0) return state;

            committed = true;
            return {
                ...state,
                wallet: nextWallet,
                lands: state.lands.map((land) =>
                    land.id === landId ? clearLand(land) : land
                ),
            };
        });

        return committed;
    },

    irrigateOwnedLand: (landId) => {
        let committed = false;

        set((state) => {
            const target = state.lands.find((land) => land.id === landId);
            if (!target || !canIrrigateLand(target)) return state;

            const nextWallet = subCurrency(state.wallet, IRRIGATION_COST_GOLD);
            if (nextWallet.gold < 0 || nextWallet.silver < 0) return state;

            committed = true;
            return {
                ...state,
                wallet: nextWallet,
                lands: state.lands.map((land) =>
                    land.id === landId ? irrigateLand(land) : land
                ),
            };
        });
        return committed;
    },

    // RESET ALL
    resetAll: () => get().startNewGame(),
}));
