import { advanceMonth, advanceYear } from '@/game/time/advanceTime';
import { GameState } from '@/game/types';
import { create } from 'zustand';

export const useGameStore = create<GameState>((set) => ({
    year: 1,
    month: 1,
    cash: 100,
    energy: 50,
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