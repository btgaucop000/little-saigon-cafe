// First-visit "tap a chair" hint: shown until the player interacts once in this browser session.

const KEY = 'lsc.seatHintSeen';

export const SEAT_HINT_EMPHASIS_MS = 2000;
export const SEAT_HINT_TIMEOUT_MS = 6000;

export function isSeatHintSeen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markSeatHintSeen(): void {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // Storage unavailable (private mode): the hint may show again after a reload; harmless.
  }
}
