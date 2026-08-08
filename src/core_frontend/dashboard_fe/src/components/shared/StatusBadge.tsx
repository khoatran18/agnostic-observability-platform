import type { StatusLevel } from '../../types';

interface StatusBadgeProps {
  level: StatusLevel | 'offline';
  dot?: boolean;
}

const LABELS: Record<string, string> = {
  recovered: 'Recovered',
  warning:   'Warning',
  alert:     'Alert',
  offline:   'Offline',
};

export function StatusBadge({ level, dot = true }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${level}`}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />}
      {LABELS[level] ?? level}
    </span>
  );
}

/** Returns CSS color variable for a status */
export function statusColor(level: StatusLevel | 'offline'): string {
  const map: Record<string, string> = {
    recovered: 'var(--green)',
    warning:   'var(--yellow)',
    alert:     'var(--red)',
    offline:   'var(--gray)',
  };
  return map[level] ?? 'var(--gray)';
}

/** Returns bar fill color class */
export function barClass(pct: number): string {
  if (pct >= 75) return 'red';
  if (pct >= 55) return 'yellow';
  return 'green';
}
