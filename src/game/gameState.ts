import type { SeatId } from './sceneLayout';

export interface GameState {
  selectedSeatId: SeatId | null;
  avatar: { seatId: SeatId | null };
  /** Increments on every successful sit; lets the UI react to the event. */
  sitCount: number;
}

export type GameAction =
  | { type: 'selectSeat'; seatId: SeatId }
  | { type: 'clearSelection' }
  | { type: 'sitAtSelected' };

export const initialGameState: GameState = {
  selectedSeatId: null,
  avatar: { seatId: null },
  sitCount: 0,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'selectSeat':
      if (state.avatar.seatId === action.seatId || state.selectedSeatId === action.seatId) return state;
      return { ...state, selectedSeatId: action.seatId };
    case 'clearSelection':
      return state.selectedSeatId === null ? state : { ...state, selectedSeatId: null };
    case 'sitAtSelected':
      if (state.selectedSeatId === null) return state;
      return {
        selectedSeatId: null,
        avatar: { seatId: state.selectedSeatId },
        sitCount: state.sitCount + 1,
      };
  }
}

export interface GameStore {
  getState(): GameState;
  dispatch(action: GameAction): void;
  subscribe(listener: () => void): () => void;
}

export function createGameStore(initial: GameState = initialGameState): GameStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action) {
      const next = gameReducer(state, action);
      if (next === state) return;
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
