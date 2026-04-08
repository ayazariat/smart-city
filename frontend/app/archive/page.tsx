"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Archive, 
  Search, 
  Filter,
  Loader2,
  ArrowLeft,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { ComplaintCard } from "@/components/ui/ComplaintCard";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { complaintService } from "@/services/complaint.service";
import { useAuthStore } from "@/store/useAuthStore";
import { Complaint } from "@/types";
import DashboardLayout from "@/components/layout/DashboardLayout";

function ArchivePageContent() {
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();
  
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !user) {
      router.push("/");
      return;
    }
  }, [hydrated, token, user, router]);

  useEffect(() => {
    const fetchArchived = async () => {
      if (!token || !hydrated || !user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await complaintService.getArchivedComplaints({
          filter: statusFilter || undefined,
          search: searchTerm || undefined,
          page: page,
          limit
        });
        
        if (response && response.success) {
          setComplaints(response.complaints || []);
          setTotal(response.total || 0);
          setTotalPages(response.pages || 1);
        } else {
          setError("Failed to load archived complaints");
        }
      } catch (err) {
        setError("Failed to load archived complaints");
      } finally {
        setLoading(false);
      }
    };

    if (hydrated && token && user) {
      fetchArchived();
    }
  }, [token, hydrated, user, page, statusFilter, searchTerm]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handleSearch = () => {
    setPage(1);
  };

  const exportCSV = () => {
    const headers = ["Reference", "Title", "Category", "Status", "Municipality", "Created"];
    const rows = filteredComplaints.map(c => [
      c.referenceId || c._id?.slice(-6),
      c.title?.replace(/,/g, " "),
      c.category,
      c.status,
      c.municipalityName || "",
      new Date(c.createdAt).toLocaleDateString()
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `archive_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const content = filteredComplaints.map(c => 
      `${c.referenceId || c._id?.slice(-6)} | ${c.title} | ${c.status} | ${c.municipalityName || ""}`
    ).join("\n");
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Archive Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #16a34a; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>Archived Complaints</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Total: ${filteredComplaints.length} complaints</p>
            <pre>${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return c.description?.toLowerCase().includes(q);
  });

  if (!hydrated) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user || !token) {
    return null;
  }

  const stats = {
    total: total,
    closed: complaints.filter(c => c.status === "CLOSED").length,
    rejected: complaints.filter(c => c.status === "REJECTED").length,
  };

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="Archived Complaints"
        subtitle={`${total} closed/rejected complaints`}
        showBackButton={false}
      />

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Archived</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Archive className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp delay-75">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Closed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.closed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp delay-150">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-200 animate-fadeIn">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search archived complaints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    handleSearch();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
              >
                <option value="">All Status</option>
                <option value="CLOSED">Closed</option>
                <option value="REJECTED">Rejected</option>
              </select>
              
              {/* Export Buttons */}
              <Button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white">
                Export CSV
              </Button>
              <Button onClick={exportPDF} className="bg-red-600 hover:bg-red-700 text-white">
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200 animate-fadeIn">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {searchTerm || statusFilter ? "No results found" : "No archived complaints"}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm || statusFilter 
                ? "Try adjusting your search or filters"
                : "Closed or rejected complaints will appear here"}
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredComplaints.map((complaint, index) => (
              <div
                key={complaint._id || complaint.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ComplaintCard
                  complaint={complaint}
                  href={`/dashboard/complaints/${complaint._id || complaint.id}`}
                  showCitizen
                  showMunicipality
                  showPriority
                  actions={
                    <button
                      onClick={() => router.push(`/dashboard/complaints/${complaint._id || complaint.id}`)}
                      className="flex items-center gap-2 text-primary hover:text-primary-700 font-medium text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
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
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
    </DashboardLayout>
  );
}

export default function ArchivePage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <ArchivePageContent />
    </Suspense>
  );
}
