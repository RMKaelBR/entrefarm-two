export type GameState = {
    year: number;
    quarter: number;
    month: number;
    wallet: Currency;
    bank: Currency;
    children: Child[];
    advanceTime: () => void;
    nextYear: () => void;
    earn: (amount: Currency) => void;
    spend: (amount: Currency) => boolean;
    deposit: (amount: Currency) => void;
    withdraw: (amount: Currency) => boolean;
    initFamily: () => void;
    addChild: (child: Child) => void;
    removeChild: (childId: string) => void;
    resetAll: () => void;
};

export type Currency = {
  gold: number;   // whole gold
  silver: number; // 0..9 ideally (normalized)
};

export type PersonStage = "child" | "adult_child";

export type Child = {
  id: string;
  name?: string;
  stage: PersonStage;

  // Time tokens represent maturity for children
  timeTokens: number;
  timeTokensMax: number;

};

export type TokenTrack = { timeTokens: number; timeTokensMax: number };
