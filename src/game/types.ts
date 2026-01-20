export type GameState = {
    year: number;
    month: number;
    cash: number;
    energy: number;
    nextYear: () => void;
    nextMonth: () => void;
    resetAll: () => void;
};