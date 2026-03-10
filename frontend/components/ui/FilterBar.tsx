import { Search, Filter } from "lucide-react";
import { STATUS_OPTIONS } from "@/lib/complaints";

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  searchPlaceholder?: string;
  statusOptions?: Array<{ value: string; label: string }>;
  count?: number;
}

/**
 * Consistent search + status-filter bar used on all complaint list pages.
 */
export const FilterBar = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  searchPlaceholder = "Search by description or category...",
  statusOptions = [...STATUS_OPTIONS],
  count,
}: FilterBarProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-100">
      <div className="flex flex-col md:flex-row gap-3 items-center">
        {/* Search input */}
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50 hover:bg-white placeholder:text-slate-400"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="flex-1 md:flex-none px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all hover:border-slate-300 cursor-pointer"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {count !== undefined && (
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
              {count} results
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
