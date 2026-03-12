"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Archive, 
  Search, 
  Filter,
  Loader2,
  ArrowLeft,
  MapPin,
  Calendar,
  Eye,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { ComplaintCard } from "@/components/ui/ComplaintCard";
import { Button } from "@/components/ui/Button";
import { complaintService } from "@/services/complaint.service";
import { useAuthStore } from "@/store/useAuthStore";
import { Complaint } from "@/types";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ArchivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, hydrated } = useAuthStore();
  
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Debounce search
  const debouncedSearch = useDebounce(searchTerm, 400);

  // Fetch archived complaints with server-side pagination and filters
  useEffect(() => {
    const fetchArchived = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const currentPage = parseInt(searchParams.get("page") || "1");
        const filter = searchParams.get("filter") || "";
        const search = searchParams.get("search") || "";
        
        const response = await complaintService.getArchivedComplaints({
          filter: filter || undefined,
          search: search || undefined,
          page: currentPage,
          limit
        });
        
        setComplaints(response.complaints || []);
        setTotal(response.total || 0);
        setTotalPages(response.pages || 1);
        setPage(currentPage);
        
        // Sync filters from URL
        setStatusFilter(filter);
        setSearchTerm(search);
      } catch (err) {
        console.error("Error fetching archived complaints:", err);
        setError("Failed to load archived complaints");
      } finally {
        setLoading(false);
      }
    };

    if (hydrated && token) {
      fetchArchived();
    }
  }, [token, hydrated, searchParams]);

  // Update URL when debounced search changes
  useEffect(() => {
    if (hydrated && token) {
      const currentSearch = searchParams.get("search") || "";
      if (debouncedSearch !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        } else {
          params.delete("search");
        }
        params.set("page", "1");
        router.push(`/archive?${params.toString()}`);
      }
    }
  }, [debouncedSearch, hydrated, token, searchParams, router]);

  // Handle filter/search changes
  const updateParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`/archive?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    updateParams({ search: value });
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    updateParams({ filter: value });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/archive?${params.toString()}`);
  };

  // Wait for hydration
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not logged in
  if (!user || !token) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm flex items-center justify-center"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-white/30" aria-hidden="true"></div>
              <div className="flex items-center gap-3">
                <Archive className="w-6 h-6" />
                <h1 className="text-2xl font-bold">Archived Complaints</h1>
              </div>
            </div>
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
              {total} archived
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search archived complaints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">All Status</option>
                <option value="CLOSED">Closed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-slate-600">Loading archived complaints...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && complaints.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Archive className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {searchTerm || statusFilter ? "No results found" : "No archived complaints"}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || statusFilter 
                ? "Try adjusting your search or filters"
                : "Closed or rejected complaints will appear here"}
            </p>
            <Button variant="primary" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        )}

        {/* Complaints List */}
        {!loading && !error && complaints.length > 0 && (
          <div className="grid gap-4">
            {complaints.map((complaint, index) => (
              <div
                key={complaint._id || complaint.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ComplaintCard
                  complaint={complaint}
                  href={`/my-complaints/${complaint._id || complaint.id}`}
                  showMunicipality
                  showPriority
                  actions={
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/my-complaints/${complaint._id || complaint.id}`)}
                        className="flex items-center gap-2 text-primary hover:text-primary-700 font-medium text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-4">
            <div className="text-sm text-slate-600">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
