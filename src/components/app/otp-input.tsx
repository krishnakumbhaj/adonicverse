'use client';

import { useEffect, useRef } from 'react';
import { cx } from './primitives';

/**
 * Separate boxes for an emailed code, dark with white digits. Typing moves to the next box,
 * Backspace goes back, and pasting (or the phone's autofill) fills them all. The digits are
 * kept together from the first box, and `onComplete` runs once every box is filled.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  // The newest code. Moving focus happens before the parent re-renders with the new `value`,
  // so the handlers read this instead of the prop, which is still one keystroke behind.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const update = (next: string) => {
    latest.current = next;
    onChange(next);
  };

  /** Moves to a box. Its digit is selected so typing replaces it (the highlight itself is hidden). */
  const focusBox = (index: number, select = true) => {
    const box = boxes.current[Math.max(0, Math.min(index, length - 1))];
    box?.focus();
    if (select) box?.select();
  };

  /** Writes `digits` starting at box `index`, then moves on. */
  const write = (index: number, digits: string) => {
    const code = latest.current;
    const next = (code.slice(0, index) + digits + code.slice(index + digits.length)).slice(0, length);
    update(next);
    // After the last digit, stay on the last box without selecting the number just typed.
    focusBox(index + digits.length, index + digits.length < length);
    if (next.length === length) onComplete?.(next);
  };

  const onInput = (index: number, raw: string) => {
    const code = latest.current;
    // The box may still hold its old digit next to the new one; keep only what was typed.
    const current = code[index] ?? '';
    const typed = (current && raw.length > 1 ? raw.replace(current, '') : raw).replace(/\D/g, '');
    if (typed) write(index, typed);
    else if (!raw) update(code.slice(0, index) + code.slice(index + 1));
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    const code = latest.current;
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      event.preventDefault();
      update(code.slice(0, index - 1));
      focusBox(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(Math.min(index + 1, code.length));
    }
  };

  const onPaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '');
    event.preventDefault();
    if (digits) write(index, digits.slice(0, length - index));
  };

  return (
    <div role="group" aria-label="Verification code" className="flex justify-between gap-2">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          value={value[index] ?? ''}
          // Boxes fill in order, so a click past the first empty box lands on that box instead.
          onFocus={() => index > latest.current.length && focusBox(latest.current.length)}
          onChange={(event) => onInput(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={(event) => onPaste(index, event)}
          className={cx(
            'h-14 w-full min-w-0 max-w-[52px] flex-1 rounded-md border bg-pal-elevated text-center text-2xl font-bold text-pal-text caret-pal-primary outline-none transition-colors selection:bg-transparent',
            'focus:border-pal-text focus:ring-1 focus:ring-pal-text disabled:opacity-50 md:h-16 md:text-[28px]',
            invalid ? 'border-pal-danger' : value[index] ? 'border-pal-muted' : 'border-pal-highlight',
          )}
        />
      ))}
    </div>
  );
}
