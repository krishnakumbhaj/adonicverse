import Link from 'next/link';
import { forwardRef } from 'react';
import { ArrowRight, LoaderCircle, Trash2, X } from 'lucide-react';

// Small Spotify-style building blocks shared by every page.

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// Text buttons are "cut" buttons: the label, then a small tab with an icon, split by a thin
// diagonal gap. Both halves share the variant's colors. On hover the gap moves left by --pull:
// the label gets that much shorter and the tab that much longer, so the button keeps its size.
const PILL = {
  primary: 'bg-pal-primary text-pal-on-primary group-hover/pill:bg-pal-primary-hover',
  white: 'bg-pal-text text-pal-base group-hover/pill:bg-[#f0f0f0]',
  outline: 'bg-white/[.08] text-pal-text group-hover/pill:bg-white/[.14]',
  ghost: 'bg-white/[.04] text-pal-subdued group-hover/pill:bg-white/[.08] group-hover/pill:text-pal-text',
  danger:
    'bg-[color-mix(in_srgb,var(--p-danger)_16%,transparent)] text-pal-danger group-hover/pill:bg-pal-danger group-hover/pill:text-black',
};
type PillVariant = keyof typeof PILL;

/** The tab's icon when a button doesn't pass its own. */
const PILL_ICON: Record<PillVariant, React.ReactNode> = {
  primary: <ArrowRight />,
  white: <ArrowRight />,
  outline: <ArrowRight />,
  ghost: <X />,
  danger: <Trash2 />,
};

// --cut is how far the diagonal edge leans: always a quarter of the height, so every size
// has the same angle and the rounded corners on that edge can be worked out once, below.
// `pad` is the label's side padding and `tab` the tab's visible width, in px.
const PILL_SIZES = {
  sm: { box: 'h-8 text-sm [--cut:8px]', pad: 16, tab: 36 },
  md: { box: 'h-10 text-sm [--cut:10px]', pad: 24, tab: 44 },
  lg: { box: 'h-12 text-base [--cut:12px]', pad: 32, tab: 48 },
};
type PillSize = keyof typeof PILL_SIZES;

type Vec = [number, number];
const LEAN = Math.atan(1 / 4);
const DOWN_SLANT: Vec = [-Math.sin(LEAN), Math.cos(LEAN)]; // along the cut, top to bottom
const UP_SLANT: Vec = [Math.sin(LEAN), -Math.cos(LEAN)];
const RADIUS = 6; // rounded-md; the square corners get it from the `rounded-md` class

/** Points along a corner rounded to RADIUS, as px offsets from the sharp corner, for an outline
 * that arrives heading `into` and leaves heading `out` (both unit vectors). */
function roundedCorner(into: Vec, out: Vec, steps = 5): Vec[] {
  const angle = Math.acos(-(into[0] * out[0] + into[1] * out[1])); // inside angle of the corner
  const reach = RADIUS / Math.tan(angle / 2); // from the corner to where the curve starts
  const middle: Vec = [out[0] - into[0], out[1] - into[1]];
  const length = Math.hypot(...middle);
  const center: Vec = [(middle[0] / length) * (RADIUS / Math.sin(angle / 2)), (middle[1] / length) * (RADIUS / Math.sin(angle / 2))];
  const from = Math.atan2(-into[1] * reach - center[1], -into[0] * reach - center[0]);
  const to = Math.atan2(out[1] * reach - center[1], out[0] * reach - center[0]);
  const sweep = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return Array.from({ length: steps + 1 }, (_, step) => {
    const at = from + (sweep * step) / steps;
    return [center[0] + RADIUS * Math.cos(at), center[1] + RADIUS * Math.sin(at)];
  });
}

const point = (x: string, y: string) => ([dx, dy]: Vec) => `calc(${x} + ${dx.toFixed(2)}px) calc(${y} + ${dy.toFixed(2)}px)`;
const polygon = (points: string[]) => `polygon(${points.join(', ')})`;

// The label: square left side, slanted right end (moved in by --pull on hover).
const BODY_SHAPE: React.CSSProperties = {
  clipPath: polygon([
    '0 0',
    ...roundedCorner([1, 0], DOWN_SLANT).map(point('100% - var(--pull)', '0px')),
    ...roundedCorner(DOWN_SLANT, [-1, 0]).map(point('100% - var(--cut) - var(--pull)', '100%')),
    '0 100%',
  ]),
};
// The tab: slanted left side, tucked back under the label's end so only a 4px slash shows.
// Its box is --reach wider than it looks, reaching further under the label; hover reveals that
// extra part by moving the slanted side left, so nothing around the button moves.
const TAB_SHAPE: React.CSSProperties = {
  clipPath: polygon([
    ...roundedCorner(UP_SLANT, [1, 0]).map(point('var(--cut) + var(--reach) - var(--pull)', '0px')),
    '100% 0',
    '100% 100%',
    ...roundedCorner([-1, 0], UP_SLANT).map(point('var(--reach) - var(--pull)', '100%')),
  ]),
  marginLeft: 'calc(4px - var(--cut) - var(--reach))',
  paddingLeft: 'calc(var(--cut) / 2 + var(--reach) - var(--pull))', // keeps the icon centered
};

const PILL_BOX =
  'group/pill items-stretch font-bold transition-transform [--reach:8px] [--pull:0px] hover:[--pull:var(--reach)] active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:hover:[--pull:0px]';

/** `center`: as wide as its text, centered on its own line (forms), instead of sitting inline. */
const pillBox = (size: PillSize, center: boolean | undefined, className: string | undefined) =>
  cx(PILL_BOX, center ? 'mx-auto flex w-fit' : 'inline-flex', PILL_SIZES[size].box, className);

type PillLook = { variant?: PillVariant; size?: PillSize; icon?: React.ReactNode; center?: boolean };

function PillFace({ variant, size, icon, loading, children }: Required<Pick<PillLook, 'variant' | 'size'>> & PillLook & { loading?: boolean; children: React.ReactNode }) {
  return (
    <>
      <span
        className={cx(
          'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md transition-[clip-path,padding,background-color,color] duration-200 ease-out',
          PILL[variant],
        )}
        style={{
          ...BODY_SHAPE,
          // Moves the text left with the shrinking end so it stays centered; the sum stays the same.
          paddingLeft: `calc(${PILL_SIZES[size].pad}px - var(--pull) / 2)`,
          paddingRight: `calc(${PILL_SIZES[size].pad}px + var(--pull) / 2)`,
        }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className={cx(
          'grid shrink-0 place-items-center rounded-md transition-[clip-path,padding,background-color,color] duration-200 ease-out [&_svg]:h-4 [&_svg]:w-4',
          PILL[variant],
        )}
        style={{ ...TAB_SHAPE, width: `calc(${PILL_SIZES[size].tab}px + var(--reach))` }}
      >
        {loading ? <LoaderCircle className="animate-spin" /> : (icon ?? PILL_ICON[variant])}
      </span>
    </>
  );
}

type PillProps = PillLook & { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PillButton({ variant = 'primary', size = 'md', icon, center, loading, className, children, disabled, ...props }: PillProps) {
  return (
    <button type="button" disabled={disabled || loading} className={pillBox(size, center, className)} {...props}>
      <PillFace variant={variant} size={size} icon={icon} loading={loading}>
        {children}
      </PillFace>
    </button>
  );
}

export function PillLink({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  center,
  className,
  children,
}: PillLook & { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={pillBox(size, center, className)}>
      <PillFace variant={variant} size={size} icon={icon}>
        {children}
      </PillFace>
    </Link>
  );
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  { label: string; size?: 'sm' | 'md' } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function IconButton({ label, size = 'md', className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'grid shrink-0 place-items-center rounded-full text-pal-subdued transition hover:scale-105 hover:text-pal-text disabled:opacity-40',
        size === 'md' ? 'h-10 w-10' : 'h-8 w-8',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors',
        selected ? 'bg-pal-text text-pal-base' : 'bg-white/[.07] text-pal-text hover:bg-white/[.12]',
      )}
    >
      {children}
    </button>
  );
}

export function ChipRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx('scrollbar-none flex gap-2 overflow-x-auto', className)}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cx('flex justify-center py-16 text-pal-subdued', className)}>
      <LoaderCircle className="h-8 w-8 animate-spin" />
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-pal-subdued">{icon}</div>}
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {text && <p className="mt-2 max-w-md text-pal-subdued">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SectionTitle({ title, href, className }: { title: string; href?: string; className?: string }) {
  return (
    <div className={cx('mb-3 flex items-end justify-between gap-4', className)}>
      <h2 className="text-[22px] font-bold tracking-tight md:text-2xl">
        {href ? (
          <Link href={href} className="hover:underline">
            {title}
          </Link>
        ) : (
          title
        )}
      </h2>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-bold text-pal-subdued hover:underline">
          Show all
        </Link>
      )}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'primary' | 'warning' | 'danger' }) {
  const tones = {
    neutral: 'bg-white/10 text-pal-subdued',
    primary: 'bg-pal-primary text-pal-on-primary',
    warning: 'border border-pal-warning text-pal-warning',
    danger: 'border border-pal-danger text-pal-danger',
  };
  return (
    <span className={cx('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider', tones[tone])}>
      {children}
    </span>
  );
}
