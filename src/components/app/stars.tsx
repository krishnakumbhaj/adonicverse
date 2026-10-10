'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cx } from './primitives';

/** Read-only stars; fractional values partly fill a star. */
export function Stars({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - star + 1));
        return (
          <span key={star} className="relative">
            <Star className={cx(className, 'text-white/20')} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cx(className, 'text-pal-rating')} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Pick 1–5 stars. */
export function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label="Your rating" className="flex" onPointerLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          onPointerEnter={() => setHover(star)}
          onClick={() => onChange(star)}
          className="p-0.5 transition hover:scale-110"
        >
          <Star className={cx('h-7 w-7', star <= shown ? 'text-pal-rating' : 'text-white/25')} fill="currentColor" strokeWidth={0} />
        </button>
      ))}
    </div>
  );
}
