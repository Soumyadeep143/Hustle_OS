import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'raised' | 'dark';
  hover?: boolean;
  animated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  hover = true,
  animated = false,
  ...rest
}) => {
  const baseStyles = 'rounded-[var(--radius-card)] border p-4 transition-all duration-300';

  const variantStyles = {
    default: 'bg-[var(--color-surface)] border-[var(--color-line)]',
    raised: 'bg-[var(--color-raised)] border-[var(--color-line)]',
    dark: 'bg-[var(--color-ink)] border-[var(--color-line)] text-[var(--color-bg)]',
  };

  const hoverStyles = hover ? 'hover:border-[var(--color-blue)]/30' : '';
  const animationStyles = animated ? 'animate-fadeIn' : '';

  return (
    <div
      {...rest}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        hoverStyles,
        animationStyles,
        className
      )}
      style={{ boxShadow: 'var(--shadow-card)', ...rest.style }}
    >
      {children}
    </div>
  );
};
