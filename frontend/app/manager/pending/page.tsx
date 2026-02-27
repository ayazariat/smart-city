"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FileText, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  ArrowLeft,
  User,
  Building2,
  AlertCircle
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { Complaint } from "@/types";

// Status config
const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  SUBMITTED: { label: "SUBMITTED", bgClass: "bg-yellow-100", textClass: "text-yellow-800" },
  VALIDATED: { label: "VALIDATED", bgClass: "bg-blue-100", textClass: "text-blue-800" },
  ASSIGNED: { label: "ASSIGNED", bgClass: "bg-purple-100", textClass: "text-purple-800" },
  IN_PROGRESS: { label: "IN PROGRESS", bgClass: "bg-orange-100", textClass: "text-orange-800" },
  RESOLVED: { label: "RESOLVED", bgClass: "bg-green-100", textClass: "text-green-800" },
  CLOSED: { label: "CLOSED", bgClass: "bg-gray-100", textClass: "text-gray-800" },
  REJECTED: { label: "REJECTED", bgClass: "bg-red-100", textClass: "text-red-800" },
};

// Category labels
const categoryLabels: Record<string, string> = {
  ROAD: "Roads",
  LIGHTING: "Lighting",
  WASTE: "Waste",
  WATER: "Water",
  SAFETY: "Safety",
  PUBLIC_PROPERTY: "Public Property",
  GREEN_SPACE: "Green Spaces",
  BUILDING: "Buildings",
  NOISE: "Noise",
  OTHER: "Other",
};

export default function ManagerPendingPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    if (!token) {
      router.push("/");
    }
  }, [token, router]);

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!token || !user || user.role !== "DEPARTMENT_MANAGER") return;
      
      try {
        setLoading(true);
        
        // Get all complaints with VALIDATED or ASSIGNED status for department
        const response = await complaintService.getAllComplaints({
          page: 1,
          limit: 50,
          status: statusFilter || undefined,
        });
        
        if (response.data && response.data.complaints) {
          setComplaints(response.data.complaints);
        }
      } catch (err) {
        console.error("Error fetching complaints:", err);
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [token, user, statusFilter]);

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch = !searchTerm || 
      complaint.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryLabels[complaint.category]?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getComplaintIdDisplay = (id: string) => {
    return `RC-${id.slice(-6)}`;
  };

  if (!user || user.role !== "DEPARTMENT_MANAGER") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 flex items-center gap-1 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                To Process
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {filteredComplaints.length} complaints
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-slate-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by description or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="VALIDATED">Validated</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Complaints List */}
        {!loading && (
          <div className="grid gap-4">
            {filteredComplaints.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-100">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No complaints found
                </h3>
                <p className="text-slate-500">
                  {searchTerm || statusFilter 
                    ? "Try modifying your search filters"
                    : "No complaints pending for your department"}
                </p>
              </div>
            ) : (
              filteredComplaints.map((complaint) => {
                const status = statusConfig[complaint.status] || {
                  label: complaint.status,
                  bgClass: "bg-gray-100",
                  textClass: "text-gray-800",
                };

                return (
                  <Link
                    key={complaint._id || complaint.id}
                    href={`/dashboard/complaints/${complaint._id || complaint.id}`}
                    className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-primary/20 group"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-slate-500">
                              {getComplaintIdDisplay(complaint._id || complaint.id || "")}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bgClass} ${status.textClass}`}>
                              {status.label}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              {categoryLabels[complaint.category] || complaint.category}
                            </span>
                          </div>
                          
                          <p className="text-slate-900 line-clamp-2 mb-3">
                            {complaint.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            {complaint.location?.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {complaint.location.address}
                              </span>
                            )}
                            {complaint.citizen && (
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {complaint.citizen.fullName}
                              </span>
                            )}
                            {complaint.department && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {complaint.department.name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {new Date(complaint.createdAt).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <div className="group-hover:translate-x-1 transition-transform text-primary">
                            →
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
