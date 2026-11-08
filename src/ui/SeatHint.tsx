import { useEffect, useState } from 'react';
import { SEAT_HINT_TIMEOUT_MS, isSeatHintSeen, markSeatHintSeen } from '../game/seatHint';

/**
 * Small one-time hint near the table. Its screen position comes from CSS variables the Pixi
 * scene sets on `.app` (--seat-hint-x / --seat-hint-y). Hidden on first interaction or timeout.
 */
export function SeatHint({ interacted }: { interacted: boolean }) {
  const [seenBefore] = useState(isSeatHintSeen);
  const [timedOut, setTimedOut] = useState(false);
  // Latch: cancelling a selection later must not bring the hint back.
  const [hasInteracted, setHasInteracted] = useState(false);
  if (interacted && !hasInteracted) setHasInteracted(true);
  const visible = !seenBefore && !timedOut && !hasInteracted;

  useEffect(() => {
    if (seenBefore) return;
    const timer = setTimeout(() => setTimedOut(true), SEAT_HINT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [seenBefore]);

  useEffect(() => {
    if (hasInteracted) markSeatHintSeen();
  }, [hasInteracted]);

  if (!visible) return null;
  return (
    <p className="seat-hint" role="note">
      Chạm vào ghế để chọn chỗ ngồi
    </p>
  );
}
