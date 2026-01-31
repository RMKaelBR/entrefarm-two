import { childrenAgeTicker } from "../family/family-functions";
import { GameState, TokenTrack } from "../types";

type TimePatch = Pick<GameState, "year" | "quarter" | "month">;

export function advanceWorldTime(state: GameState): Partial<GameState> {
  const isQuarterEnd = state.month % 3 === 0;
  const nextTime = advanceTime(state);

  return {
    ...nextTime,
    children: isQuarterEnd ? childrenAgeTicker(state.children) : state.children,
  };
}

export function advanceTime(state: GameState): TimePatch {
  const nextMonth = state.month === 12 ? 1 : state.month + 1;
  const nextYear = state.month === 12 ? state.year + 1 : state.year;
  const nextQuarter = Math.floor((nextMonth - 1) / 3) + 1;

  return {
    year: nextYear,
    quarter: nextQuarter,
    month: nextMonth,
  };
}

export function advanceYear(state: GameState): Partial<GameState> {
  return {
    year: state.year + 1,
  };
}

export function advanceQuarter(state: GameState): Partial<GameState> {
  return {
    year: state.quarter === 4 ? state.year + 1 : state.year,
    quarter: state.quarter === 4 ? 1 : state.quarter + 1,
    month: state.quarter === 4 ? 1 : state.month + 3,
  };
}

export function advanceMonth(state: GameState): Partial<GameState> {
  const isYearEnd = state.month === 12;
  
  return ({
    year: isYearEnd ? state.year + 1 : state.year,
    quarter: isYearEnd ? 1 : Math.floor((state.month) / 3) + 1,
    month: isYearEnd ? 1 : state.month + 1,
  });
}

export function addTimeToken<T extends TokenTrack>(item: T, n = 1): T {
  const timeTokens = Math.min(item.timeTokens + n, item.timeTokensMax);
  return { ...item, timeTokens };
}