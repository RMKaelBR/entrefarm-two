import { create } from 'zustand';

type GameState = {
    day: number;
    cash: number;
    energy: number;
    nextDay: () => void;
    resetAll: () => void;
};

export const useGameStore = create<GameState>((set) => ({
    day: 1,
    cash: 100,
    energy: 50,
    nextDay: () =>
        set((state) => ({
            day: state.day + 1,
            cash: state.cash + 20, // Example logic for cash increment
            energy: Math.min(state.energy + 10, 100), // Example logic for energy increment
        })),
    resetAll: () =>
        set(() => ({
            day: 1,
            cash: 100,
            energy: 50,
        })),
}));