import { forwardRef } from 'react';
import { CircleAlert } from 'lucide-react';
import { cx } from './primitives';

// Form fields in Spotify's style: bold label, dark input with a gray border that turns white.

const INPUT =
  'w-full rounded border border-pal-muted bg-pal-surface px-3.5 py-3 text-base text-pal-text outline-none transition-colors placeholder:text-pal-muted hover:border-pal-text focus:border-pal-text focus:ring-1 focus:ring-pal-text';

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-2 flex items-center gap-1.5 text-sm text-pal-danger">
      <CircleAlert className="h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

type FieldProps = { label: string; error?: string; hint?: string; trailing?: React.ReactNode };

export const TextField = forwardRef<HTMLInputElement, FieldProps & React.InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, error, hint, trailing, className, id, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className={className}>
        <label htmlFor={inputId} className="mb-2 block text-sm font-bold">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            className={cx(INPUT, error && 'border-pal-danger', trailing ? 'pr-12' : '')}
            {...props}
          />
          {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
        </div>
        {hint && !error && <p className="mt-2 text-sm text-pal-subdued">{hint}</p>}
        <FieldError message={error} />
      </div>
    );
  },
);

export const TextAreaField = forwardRef<HTMLTextAreaElement, FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextAreaField({ label, error, hint, className, id, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className={className}>
        <label htmlFor={inputId} className="mb-2 block text-sm font-bold">
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cx(INPUT, 'min-h-28 resize-y', error && 'border-pal-danger')}
          {...props}
        />
        {hint && !error && <p className="mt-2 text-sm text-pal-subdued">{hint}</p>}
        <FieldError message={error} />
      </div>
    );
  },
);

export const SelectField = forwardRef<HTMLSelectElement, FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectField({ label, error, hint, className, id, children, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className={className}>
        <label htmlFor={inputId} className="mb-2 block text-sm font-bold">
          {label}
        </label>
        <select ref={ref} id={inputId} className={cx(INPUT, 'appearance-auto')} {...props}>
          {children}
        </select>
        {hint && !error && <p className="mt-2 text-sm text-pal-subdued">{hint}</p>}
        <FieldError message={error} />
      </div>
    );
  },
);

/** A banner for errors that aren't about one field. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-3 rounded bg-pal-danger px-4 py-3 text-sm font-semibold text-black">
      <CircleAlert className="h-5 w-5 shrink-0" />
      {message}
    </div>
  );
}
