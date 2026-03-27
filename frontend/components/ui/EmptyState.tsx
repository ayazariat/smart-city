import { FileText, Inbox, Search, AlertCircle } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  icon?: "file" | "inbox" | "search" | "alert" | ReactNode;
}

const icons = {
  file: FileText,
  inbox: Inbox,
  search: Search,
  alert: AlertCircle,
};

export const EmptyState = ({
  title = "No items found",
  message,
  action,
  icon = "inbox",
}: EmptyStateProps) => {
  const IconComponent = typeof icon === "string" ? icons[icon as keyof typeof icons] : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200 animate-fadeInUp">
      {/* Icon Container */}
      <div className="relative mx-auto mb-6 w-24 h-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl transform rotate-6" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl transform -rotate-3" />
        <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl flex items-center justify-center border border-slate-200 shadow-sm">
          {IconComponent ? (
            <IconComponent className="w-10 h-10 text-slate-400" />
          ) : (
            icon
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary/10 rounded-full animate-bounce-soft" />
        <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-primary/10 rounded-full animate-bounce-soft delay-200" />
      </div>

      {/* Text Content */}
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">
        {message}
      </p>

      {/* Action */}
      {action && (
        <div className="flex justify-center animate-fadeIn delay-200">
          {action}
        </div>
      )}

      {/* Decorative dots */}
      <div className="flex items-center justify-center gap-2 mt-8">
        <div className="w-2 h-2 bg-slate-300 rounded-full" />
        <div className="w-2 h-2 bg-slate-300 rounded-full delay-100" />
        <div className="w-2 h-2 bg-slate-300 rounded-full delay-200" />
      </div>
    </div>
  );
};
