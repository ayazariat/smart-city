import { Search, Filter, X } from "lucide-react";
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
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-200 animate-fadeIn">
      <div className="flex flex-col md:flex-row gap-3 items-center">
        {/* Search Input */}
        <div className="flex-1 w-full relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-sm border border-slate-200 rounded-xl 
                       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary 
                       transition-all bg-slate-50/50 hover:bg-white 
                       placeholder:text-slate-400 shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full 
                         bg-slate-200 hover:bg-slate-300 text-slate-500 flex items-center justify-center
                         transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 rounded-xl text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Filter</span>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="flex-1 md:flex-none px-4 py-3 text-sm border border-slate-200 rounded-xl 
                       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary 
                       bg-white transition-all hover:border-primary/50 cursor-pointer
                       shadow-sm font-medium"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchTerm || statusFilter) && (
            <button
              onClick={() => {
                onSearchChange("");
                onStatusChange("");
              }}
              className="px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/10 
                         rounded-xl transition-colors border border-primary/20"
            >
              Clear
            </button>
          )}

          {count !== undefined && (
            <span className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-full 
                           text-xs font-semibold bg-primary text-white shadow-sm">
              {count} found
            </span>
          )}
        </div>
      </div>

      {/* Active Filters Indicator */}
      {(searchTerm || statusFilter) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">Active filters:</span>
          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary 
                           rounded-full text-xs font-medium">
              Search: "{searchTerm}"
            </span>
          )}
          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary 
                           rounded-full text-xs font-medium">
              Status: {statusFilter}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
