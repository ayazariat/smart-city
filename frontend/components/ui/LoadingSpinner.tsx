interface LoadingSpinnerProps {
  /** When true, the spinner is centred inside a full-viewport screen. */
  fullScreen?: boolean;
  text?: string;
}

/**
 * Consistent loading spinner.
 * Uses the primary green palette to match the rest of the app.
 */
export const LoadingSpinner = ({
  fullScreen = false,
  text = "Loading...",
}: LoadingSpinnerProps) => {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      {text && <p className="text-slate-500 text-sm">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">{spinner}</div>
  );
};
