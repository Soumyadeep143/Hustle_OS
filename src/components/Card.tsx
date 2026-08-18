import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'dark';
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
  const baseStyles = 'rounded-lg border p-6 transition-all duration-300';

  const variantStyles = {
    default: 'bg-zinc-900/80 border-zinc-800',
    gradient: 'bg-gradient-to-br from-blue-950/40 via-zinc-900/80 to-red-950/30 border-blue-900/40',
    dark: 'bg-black/60 border-zinc-900',
  };

  const hoverStyles = hover ? 'hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/30' : '';
  const animationStyles = animated ? 'animate-fadeIn' : '';

  return (
    <div
      className={clsx(
        baseStyles,
        variantStyles[variant],
        hoverStyles,
        animationStyles,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
