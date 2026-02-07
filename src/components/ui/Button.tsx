import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn, haptic } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export const Button = ({ 
  className, 
  variant = 'primary', 
  isLoading,
  children, 
  ...props 
}: ButtonProps) => {
  const baseStyles = "h-12 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100 no-tap-highlight select-none";
  
  const variants = {
    primary: "bg-primary text-background hover:bg-white/90 shadow-lg shadow-white/5",
    secondary: "bg-surface-highlight text-primary hover:bg-zinc-700",
    ghost: "bg-transparent text-secondary hover:text-primary hover:bg-surface-highlight/50",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], className)} 
      disabled={isLoading || props.disabled}
      aria-busy={isLoading}
      onClick={(e) => {
        if (!props.disabled && !isLoading) haptic.light();
        props.onClick?.(e);
      }}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};
