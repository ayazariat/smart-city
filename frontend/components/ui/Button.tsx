import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Composant Button avec la palette Tunis Vert Civique
 * Animations fluides et micro-interactions modernes
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    icon, 
    fullWidth = false,
    className = '',
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-4 disabled:cursor-not-allowed active:scale-95 relative overflow-hidden';
    
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-700 hover:shadow-lg hover:shadow-primary/25 focus:ring-primary/20 disabled:bg-primary/50 shadow-md hover:-translate-y-0.5',
      secondary: 'bg-secondary-400 text-slate-700 hover:bg-secondary-500 hover:shadow-lg hover:shadow-secondary-300/25 focus:ring-secondary-400/20 disabled:bg-secondary-200 shadow-md hover:-translate-y-0.5',
      outline: 'border-2 border-primary text-primary hover:bg-primary/5 hover:border-primary-700 focus:ring-primary/20 disabled:border-primary/50 disabled:text-primary/50 hover:shadow-md',
      ghost: 'text-primary hover:bg-primary/10 focus:ring-primary/20 disabled:text-primary/50 hover:shadow-sm'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Effet shimmer au survol */}
        <span className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-0 hover:opacity-100 transition-opacity" />
        
        {isLoading ? (
          <>
            <LoaderCircle size={18} className="animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && <span className="flex-shrink-0 transition-transform group-hover:scale-110">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
