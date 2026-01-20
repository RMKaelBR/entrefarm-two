import { GameState } from "../types";

export function advanceTime(state: GameState): Partial<GameState> {
  const isYearEnd = state.month === 12;

  return {
    month: isYearEnd ? 1 : state.month + 1,
    year: isYearEnd ? state.year + 1 : state.year,
    cash: state.cash + 20,
    energy: Math.min(state.energy + 10, 100),
  };
}

export function advanceYear(state: GameState): Partial<GameState> {
  return {
    year: state.year + 1,
    cash: state.cash + 100,
    energy: Math.min(state.energy + 20, 100),
  };
}

export function advanceMonth(state: GameState): Partial<GameState> {
  return ({
    month: state.month === 12 ? 1 : state.month + 1,
    year: state.month === 12 ? state.year + 1 : state.year,
    cash: state.cash + 20,
    energy: Math.min(state.energy + 10, 100),
  });
}