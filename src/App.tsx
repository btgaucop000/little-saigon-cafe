import { useSyncExternalStore } from 'react';
import type { GameStore } from './game/gameState';
import { otherSeatId } from './game/sceneLayout';
import { CafeCanvas } from './ui/CafeCanvas';
import { SeatHint } from './ui/SeatHint';
import { SeatPrompt } from './ui/SeatPrompt';
import { Toast } from './ui/Toast';

export function App({ store }: { store: GameStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const other = state.selectedSeatId ? otherSeatId(state.selectedSeatId) : null;
  // Only offered when the other chair is free (not the one the avatar sits on).
  const canSwitch = other !== null && other !== state.avatar.seatId;

  return (
    <main
      className="app"
      data-selected-seat={state.selectedSeatId ?? 'none'}
      data-avatar-seat={state.avatar.seatId ?? 'none'}
    >
      <CafeCanvas store={store} />

      <header className="sign">
        <h1>Cà Phê Vỉa Hè</h1>
        <p>Ngoài kia vội quá, vào đây ngồi chút.</p>
      </header>

      <SeatHint interacted={state.selectedSeatId !== null || state.avatar.seatId !== null} />

      {state.selectedSeatId && (
        <SeatPrompt
          onConfirm={() => store.dispatch({ type: 'sitAtSelected' })}
          onCancel={() => store.dispatch({ type: 'clearSelection' })}
          onSwitch={canSwitch ? () => store.dispatch({ type: 'selectSeat', seatId: other }) : undefined}
        />
      )}

      {state.sitCount > 0 && <Toast key={state.sitCount} message="Ngồi xuống rồi, cứ thong thả nhé ☕" />}
    </main>
  );
}
