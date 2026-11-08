import { useEffect } from 'react';

interface SeatPromptProps {
  onConfirm: () => void;
  onCancel: () => void;
  /** Moves the selection to the other chair; omitted when that chair is taken. */
  onSwitch?: () => void;
}

/** Compact confirmation bar: question + close on top, "Đổi ghế" / "Ngồi đây" below. */
export function SeatPrompt({ onConfirm, onCancel, onSwitch }: SeatPromptProps) {
  // Escape closes the bar for keyboard users (tapping empty pavement closes it on touch).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <section className="sheet" aria-label="Chỗ ngồi">
      <div className="sheet-head">
        <p className="sheet-title">Ngồi chỗ này nhé?</p>
        <button type="button" className="sheet-close" onClick={onCancel} aria-label="Đóng">
          ×
        </button>
      </div>
      <div className="sheet-actions">
        {onSwitch && (
          <button type="button" className="btn btn-ghost" onClick={onSwitch}>
            Đổi ghế
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={onConfirm} autoFocus>
          Ngồi đây
        </button>
      </div>
    </section>
  );
}
