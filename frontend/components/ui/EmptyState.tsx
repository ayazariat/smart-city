import { FileText } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/**
 * Consistent empty-state placeholder card.
 */
export const EmptyState = ({
  title = "No complaints found",
  message,
  action,
  icon,
}: EmptyStateProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-100">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
        {icon ?? <FileText className="w-8 h-8 text-slate-300" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-4">{message}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};
