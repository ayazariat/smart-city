import React, { InputHTMLAttributes, ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  helperText?: string;
}

/**
 * Composant Input avec la palette Tunis Vert Civique
 * Validation visuelle et animations fluides
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, type, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-urgent-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full px-3 py-2.5 
              ${icon ? 'pl-10' : ''} 
              ${isPassword ? 'pr-10' : ''}
              border rounded-lg
              transition-all duration-300
              ${error 
                ? 'border-urgent-300 focus:border-urgent-500 focus:ring-urgent-500/20 focus:shadow-lg focus:shadow-urgent-100' 
                : 'border-slate-200 focus:border-primary focus:ring-primary/20 focus:shadow-lg focus:shadow-primary/5'
              }
              focus:outline-none focus:ring-4
              placeholder:text-slate-400
              disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
              hover:border-slate-300
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-urgent-600 flex items-center gap-1">
            <span className="inline-block w-1 h-1 bg-urgent-600 rounded-full"></span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
