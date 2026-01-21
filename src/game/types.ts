export type GameState = {
    year: number;
    month: number;
    energy: number;
    wallet: Currency;
    bank: Currency;
    earn: (amount: Currency) => void;
    spend: (amount: Currency) => boolean;
    deposit: (amount: Currency) => void;
    withdraw: (amount: Currency) => boolean;
    nextYear: () => void;
    nextMonth: () => void;
    resetAll: () => void;
};

export type Currency = {
  gold: number;   // whole gold
  silver: number; // 0..9 ideally (normalized)
};