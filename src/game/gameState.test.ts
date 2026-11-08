import { createGameStore } from './gameState';
import { findSeatAt, interactiveSeats, sceneLayout } from './sceneLayout';

describe('game state', () => {
  it('selects, cancels and sits', () => {
    const store = createGameStore();
    store.dispatch({ type: 'selectSeat', seatId: 'seat-left' });
    expect(store.getState().selectedSeatId).toBe('seat-left');

    store.dispatch({ type: 'clearSelection' });
    expect(store.getState().selectedSeatId).toBeNull();

    store.dispatch({ type: 'selectSeat', seatId: 'seat-right' });
    store.dispatch({ type: 'sitAtSelected' });
    expect(store.getState()).toMatchObject({
      selectedSeatId: null,
      avatar: { seatId: 'seat-right' },
      sitCount: 1,
    });
  });

  it('ignores sitting without a selection and selecting the seat already taken', () => {
    const store = createGameStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'sitAtSelected' });
    expect(listener).not.toHaveBeenCalled();

    store.dispatch({ type: 'selectSeat', seatId: 'seat-left' });
    store.dispatch({ type: 'sitAtSelected' });
    store.dispatch({ type: 'selectSeat', seatId: 'seat-left' });
    expect(store.getState().selectedSeatId).toBeNull();
  });
});

describe('seat hit test', () => {
  it('hits a seat via its enlarged hitbox and misses empty floor', () => {
    const left = sceneLayout.seats[0];
    const nearEdge = { x: left.position.x + 60, y: left.position.y - 100 };
    expect(findSeatAt(sceneLayout.seats, nearEdge)?.id).toBe(left.id);
    expect(findSeatAt(sceneLayout.seats, { x: sceneLayout.table.x, y: 900 })).toBeNull();
  });

  it('exposes both First Seat chairs; only the right one sits mirrored', () => {
    expect(interactiveSeats.map((s) => s.id)).toEqual(['seat-left', 'seat-right']);
    expect(sceneLayout.seats.map((s) => s.sitMirrored)).toEqual([false, true]);
    const table = sceneLayout.table;
    expect(findSeatAt(interactiveSeats, { x: table.x, y: table.y - 60 })).toBeNull();
  });

  it('switches seats while seated through the same selection model', () => {
    const store = createGameStore();
    store.dispatch({ type: 'selectSeat', seatId: 'seat-left' });
    store.dispatch({ type: 'selectSeat', seatId: 'seat-right' });
    expect(store.getState().selectedSeatId).toBe('seat-right');
    store.dispatch({ type: 'sitAtSelected' });
    store.dispatch({ type: 'selectSeat', seatId: 'seat-left' });
    store.dispatch({ type: 'sitAtSelected' });
    expect(store.getState()).toMatchObject({ avatar: { seatId: 'seat-left' }, sitCount: 2 });
  });
});
