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
    default: 'bg-slate-800 border-slate-700',
    gradient: 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600',
    dark: 'bg-slate-900 border-slate-800',
  };

  const hoverStyles = hover ? 'hover:shadow-xl hover:border-blue-500/50' : '';
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
