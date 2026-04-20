import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  text?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner = ({
  fullScreen = false,
  text = "Loading...",
  size = "md",
}: LoadingSpinnerProps) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      {/* Spinner */}
      <div className="relative">
        {/* Background circle */}
        <div className={`${sizes[size]} border-4 border-primary/20 rounded-full`} />
        
        {/* Animated spinner */}
        <div className={`absolute inset-0 ${sizes[size]} border-4 border-primary border-t-transparent rounded-full animate-spin`}>
          {/* Gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer rounded-full" />
        </div>
        
        {/* Inner dot */}
        <div className="absolute inset-2 bg-primary/10 rounded-full animate-pulse" />
      </div>

      {/* Loading text */}
      <div className="text-center">
        <p className={`${textSizes[size]} text-slate-600 font-medium animate-pulse`}>
          {text}
        </p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce-soft" />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce-soft delay-100" />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce-soft delay-200" />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <div className="animate-fadeIn">{spinner}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16 animate-fadeIn">
      {spinner}
    </div>
  );
};
