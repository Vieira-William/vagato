import { clsx } from 'clsx';

const variants = {
  default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  primary: 'bg-accent-primary/15 text-accent-primary',
  success: 'bg-accent-success/15 text-accent-success',
  warning: 'bg-accent-warning/15 text-accent-warning',
  danger: 'bg-accent-danger/15 text-accent-danger',
  info: 'bg-accent-info/15 text-accent-info',
  purple: 'bg-accent-purple/15 text-accent-purple',
};

const sizes = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-2.5 py-1.5 gap-2',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export default function Badge({ children, variant = 'default', size = 'md', icon: Icon, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {Icon && <Icon className={iconSizes[size]} />}
      {children}
    </span>
  );
}
