import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const baseStyles = 'inline-flex items-center font-semibold uppercase tracking-[.13em] rounded-[var(--radius-chip)]';

  const variantStyles = {
    default: 'bg-[var(--color-line-2)] text-[var(--color-ink-2)]',
    success: 'bg-[var(--color-blue-soft)] text-[var(--color-blue)]',
    warning: 'bg-[var(--color-yellow-soft)] text-[var(--color-yellow)]',
    danger: 'bg-[var(--color-red-soft)] text-[var(--color-red)]',
    info: 'bg-[var(--color-blue-soft)] text-[var(--color-blue)]',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[9.5px]',
    md: 'px-2 py-1 text-[10px]',
    lg: 'px-2.5 py-1.5 text-xs',
  };

  return (
    <span
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
