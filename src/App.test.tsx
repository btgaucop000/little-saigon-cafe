import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { createGameStore } from './game/gameState';

// PixiJS needs WebGL, which jsdom lacks; the real scene is covered by E2E instead.
vi.mock('./ui/CafeCanvas', () => ({ CafeCanvas: () => <div data-testid="cafe-scene" /> }));

describe('App seat flow', () => {
  it('shows "Ngồi đây" for a selected seat and sits on confirm', async () => {
    const store = createGameStore();
    render(<App store={store} />);
    expect(screen.getByRole('heading', { name: 'Cà Phê Vỉa Hè' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ngồi đây' })).not.toBeInTheDocument();

    // Simulates what the Pixi scene dispatches on a tap.
    act(() => store.dispatch({ type: 'selectSeat', seatId: 'seat-left' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ngồi đây' }));

    expect(store.getState().avatar.seatId).toBe('seat-left');
    expect(screen.queryByRole('button', { name: 'Ngồi đây' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ngồi xuống rồi');
  });

  it('"Đổi ghế" moves the selection without sitting', async () => {
    const store = createGameStore();
    render(<App store={store} />);
    act(() => store.dispatch({ type: 'selectSeat', seatId: 'seat-left' }));
    const sw = screen.getByRole('button', { name: 'Đổi ghế' });
    await userEvent.click(sw);
    expect(store.getState()).toMatchObject({ selectedSeatId: 'seat-right', avatar: { seatId: null } });
    await userEvent.click(screen.getByRole('button', { name: 'Đổi ghế' }));
    expect(store.getState().selectedSeatId).toBe('seat-left');
    expect(screen.getByRole('button', { name: 'Ngồi đây' })).toBeInTheDocument();
  });

  it('hides the switch action when the other chair is the one the avatar sits on', () => {
    const store = createGameStore();
    store.dispatch({ type: 'selectSeat', seatId: 'seat-left' });
    store.dispatch({ type: 'sitAtSelected' });
    render(<App store={store} />);
    act(() => store.dispatch({ type: 'selectSeat', seatId: 'seat-right' }));
    expect(screen.getByRole('button', { name: 'Ngồi đây' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đổi ghế' })).not.toBeInTheDocument();
  });

  it('closes the bar with × or Escape without sitting', async () => {
    const store = createGameStore();
    render(<App store={store} />);
    act(() => store.dispatch({ type: 'selectSeat', seatId: 'seat-right' }));
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(store.getState().selectedSeatId).toBeNull();
    expect(store.getState().avatar.seatId).toBeNull();

    act(() => store.dispatch({ type: 'selectSeat', seatId: 'seat-left' }));
    await userEvent.keyboard('{Escape}');
    expect(store.getState().selectedSeatId).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ngồi đây' })).not.toBeInTheDocument();
  });
});
