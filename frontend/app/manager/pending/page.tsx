"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FileText, Wrench, Flag, TrendingUp, Users,
  Clock, AlertTriangle, Filter, Download, Search, CheckCircle
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { managerService } from "@/services/manager.service";
import { categoryLabels, STATUS_OPTIONS } from "@/lib/complaints";
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
  Modal,
  Button,
  ConfirmationModal,
} from "@/components/ui";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { BaseComplaint } from "@/components/ui";

interface ManagerComplaint extends BaseComplaint {
  _id: string;
  title?: string;
  updatedAt?: string;
  createdBy?: { fullName: string };
}

export default function ManagerPendingPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [complaints, setComplaints] = useState<ManagerComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [departmentName, setDepartmentName] = useState<string>("");
  const [technicians, setTechnicians] = useState<Array<{ _id: string; fullName: string }>>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [assignTechTarget, setAssignTechTarget] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState("");

  const [priorityTarget, setPriorityTarget] = useState<string | null>(null);
  const [priorityScore, setPriorityScore] = useState<number>(5);

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    type: "assignTech" | "changePriority" | null;
    targetId: string | null;
    targetName: string;
  }>({ type: null, targetId: null, targetName: "" });

  // Update available municipalities when governorate changes
  useEffect(() => {
    if (!token) router.push("/");
  }, [token, router]);

  const refreshComplaints = async () => {
    const response = await managerService.getManagerComplaints({ status: statusFilter || undefined });
    if (response.data) {
      setComplaints(response.data.complaints);
      if (response.data.departmentName) {
        setDepartmentName(response.data.departmentName);
      }
    }
  };

  useEffect(() => {
    const fetch = async () => {
      if (!token || !user || user.role !== "DEPARTMENT_MANAGER") return;
      try {
        setLoading(true);
        const response = await managerService.getManagerComplaints({
          page: 1,
          limit: 100,
          status: statusFilter || undefined,
        });
        if (response.data?.complaints) {
          setComplaints(response.data.complaints);
          if (response.data.departmentName) {
            setDepartmentName(response.data.departmentName);
          }
        }
      } catch (err) {
        console.error("Error fetching complaints:", err);
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token, user, statusFilter]);

  useEffect(() => {
    const fetchTechs = async () => {
      if (!token || !user || user.role !== "DEPARTMENT_MANAGER") return;
      try {
        const response = await managerService.getTechnicians();
        if (response.data) setTechnicians(response.data);
      } catch (err) {
        console.error("Error fetching technicians:", err);
      }
    };
    fetchTechs();
  }, [token, user]);

  const handleAssignTechnician = async () => {
    if (!assignTechTarget || !selectedTechnician) return;
    setActionLoading(assignTechTarget);
    try {
      const result = await managerService.assignTechnician(assignTechTarget, selectedTechnician);
      if (result.success) {
        setAssignTechTarget(null);
        setSelectedTechnician("");
        await refreshComplaints();
      } else {
        alert((result as { message?: string }).message || "Failed to assign technician");
      }
    } catch (err: unknown) {
      console.error("Error assigning technician:", err);
      const errorObj = err as { message?: string };
      alert(errorObj?.message || "Failed to assign technician");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePriority = async () => {
    if (!priorityTarget) return;
    setActionLoading(priorityTarget);
    try {
      await managerService.updatePriority(priorityTarget, { priorityScore });
      setPriorityTarget(null);
      await refreshComplaints();
    } catch (err) {
      console.error("Error updating priority:", err);
      alert("Failed to update priority");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter complaints based on all filters
  const filteredComplaints = complaints.filter((c) => {
    if (priorityFilter) {
      const score = c.priorityScore || 0;
      if (priorityFilter === "HIGH" && score < 15) return false;
      if (priorityFilter === "MEDIUM" && (score < 6 || score >= 15)) return false;
      if (priorityFilter === "LOW" && score >= 6) return false;
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      c.location?.address?.toLowerCase().includes(q)
    );
  });

  // Calculate statistics - ONLY count based on SLA deadline passed
  const overdueCount = complaints.filter(c => {
    // Exclude resolved/closed/rejected
    if (["RESOLVED", "CLOSED", "REJECTED"].includes(c.status)) return false;
    
    // ONLY count if SLA deadline is in the past
    if (c.slaDeadline) {
      const deadlineDate = new Date(c.slaDeadline);
      return deadlineDate.getTime() < Date.now();
    }
    
    // No fallback - if no deadline, don't count as overdue
    return false;
  }).length;
  
  const atRiskCount = complaints.filter(c => {
    if (["RESOLVED", "CLOSED", "REJECTED"].includes(c.status)) return false;
    
    if (c.slaDeadline) {
      const deadlineDate = new Date(c.slaDeadline);
      const createdDate = new Date(c.createdAt);
      const nowDate = new Date();
      const totalMs = deadlineDate.getTime() - createdDate.getTime();
      const elapsedMs = nowDate.getTime() - createdDate.getTime();
      
      if (totalMs > 0 && elapsedMs > 0) {
        const progress = (elapsedMs / totalMs) * 100;
        return progress >= 80 && progress < 100;
      }
    }
    return false;
  }).length;

  const resolvedCount = complaints.filter(c => c.status === "RESOLVED" || c.status === "CLOSED").length;
  const highPriorityCount = complaints.filter(c => (c.priorityScore || 0) >= 15).length;
  const avgDays = complaints.length > 0 
    ? Math.round(complaints.reduce((acc, c) => {
        const days = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return acc + days;
      }, 0) / complaints.length * 10) / 10
    : 0;
  const resolutionRate = complaints.length > 0 
    ? Math.round((resolvedCount / complaints.length) * 100) 
    : 0;

  // Get categories count
  const byCategory: Record<string, number> = {};
  filteredComplaints.forEach(c => {
    const cat = categoryLabels[c.category] || c.category || "Other";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  // Export functions
  const exportCSV = () => {
    const headers = ["Reference", "Title", "Category", "Status", "Priority", "Municipality", "Created"];
    const rows = filteredComplaints.map(c => [
      c._id || c.id || "",
      c.title?.replace(/,/g, " "),
      categoryLabels[c.category] || c.category,
      c.status,
      (c.priorityScore || 0).toString(),
      c.municipalityName || "",
      new Date(c.createdAt).toLocaleDateString()
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manager_complaints_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    // Create printable content
    const content = filteredComplaints.map(c => 
      `${c._id?.slice(-6)} | ${c.description?.slice(0, 50)} | ${c.status} | ${categoryLabels[c.category] || c.category} | ${c.municipalityName || ""}`
    ).join("\n");
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Department Complaints Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #16a34a; }
              pre { white-space: pre-wrap; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f3f4f6; }
            </style>
          </head>
          <body>
            <h1>Department Complaints Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Department: ${departmentName || "All"}</p>
            <p>Total: ${filteredComplaints.length} complaints</p>
            <table>
              <tr><th>Reference</th><th>Description</th><th>Status</th><th>Category</th><th>Municipality</th></tr>
              ${filteredComplaints.map(c => `
                <tr>
                  <td>${c._id?.slice(-6)}</td>
                  <td>${(c.description || "").slice(0, 50)}</td>
                  <td>${c.status}</td>
                  <td>${categoryLabels[c.category] || c.category}</td>
                  <td>${c.municipalityName || ""}</td>
                </tr>
              `).join("")}
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!user || user.role !== "DEPARTMENT_MANAGER") return null;

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="All Complaints"
        subtitle={departmentName ? `Complaints in ${departmentName}` : "Manager complaint management"}
        backHref="/dashboard"
        rightContent={
          <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
            {filteredComplaints.length} complaints
          </span>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Complaints</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{complaints.length}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Resolved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{resolvedCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">At Risk (SLA)</p>
                <p className="text-xs text-amber-500 mt-1">Close to deadline</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{atRiskCount}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Overdue</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{overdueCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{complaints.filter(c => c.status === "IN_PROGRESS").length}</p>
              <p className="text-xs text-slate-500 mt-1">In Progress</p>
              <p className="text-[10px] text-blue-400">Currently being worked on</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <p className="text-2xl font-bold text-purple-600">{avgDays}</p>
              <p className="text-xs text-slate-500 mt-1">Average Days</p>
              <p className="text-[10px] text-purple-400">Time to process</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-2xl font-bold text-emerald-600">{resolutionRate}%</p>
              <p className="text-xs text-slate-500 mt-1">Resolution Rate</p>
              <p className="text-[10px] text-emerald-400">Percentage resolved</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <p className="text-2xl font-bold text-orange-600">{highPriorityCount}</p>
              <p className="text-xs text-slate-500 mt-1">High Priority</p>
              <p className="text-[10px] text-orange-400">Urgent issues (score 15+)</p>
            </div>
          </div>
          
          {/* Categories */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-600 mb-2">Categories:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byCategory).slice(0, 5).map(([cat, count]) => (
                <span key={cat} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                  {cat}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-200">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Show Filters Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>

            {/* Export Buttons */}
            <div className="flex gap-2 ml-auto">
              <Button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={exportPDF} className="bg-red-600 hover:bg-red-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                {/* Search */}
                <div className="flex-1 w-full relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by description or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">All Priorities</option>
                  <option value="HIGH">High (≥15)</option>
                  <option value="MEDIUM">Medium (6-14)</option>
                  <option value="LOW">Low (&lt;6)</option>
                </select>

                {/* Results Count */}
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {filteredComplaints.length} results
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && <LoadingSpinner />}

        {/* Complaints List */}
        {!loading && (
          filteredComplaints.length === 0 ? (
            <EmptyState
              icon="file"
              message={
                searchTerm || statusFilter || priorityFilter
                  ? "Try adjusting your search or filters."
                  : "No complaints pending for your department."
              }
            />
          ) : (
            <div className="grid gap-5">
              {filteredComplaints.map((complaint, index) => {
                const id = complaint._id || complaint.id || "";

                return (
                  <ComplaintCard
                    key={id}
                    complaint={complaint}
                    showCitizen
                    showAssignedTo
                    showPriority
                    index={index}
                    actions={
                      <>
                        {complaint.status === "ASSIGNED" && !complaint.assignedTo && (
                          <button
                            onClick={() => setAssignTechTarget(id)}
                            disabled={actionLoading === id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-primary/25"
                          >
                            <Wrench className="w-4 h-4" />
                            Assign Technician
                          </button>
                        )}
                        {(complaint.status === "VALIDATED" || complaint.status === "ASSIGNED") && (
                        <button
                          onClick={() => {
                            setPriorityTarget(id);
                            setPriorityScore(complaint.priorityScore ?? 5);
                          }}
                          disabled={actionLoading === id}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all text-sm font-medium disabled:opacity-50 hover:shadow-lg"
                        >
                          <Flag className="w-4 h-4" />
                          Priority
                        </button>
                        )}
                        <Link
                          href={`/dashboard/complaints/${id}?from=manager`}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          Details
                        </Link>
                      </>
                    }
                  />
                );
              })}
            </div>
          )
        )}
      </main>

      {/* Assign Technician Modal */}
      <Modal
        isOpen={assignTechTarget !== null}
        onClose={() => { setAssignTechTarget(null); setSelectedTechnician(""); }}
        title="Assign to Technician"
        description="Select the technician who will handle this complaint."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAssignTechTarget(null); setSelectedTechnician(""); }} disabled={actionLoading !== null}>
              Cancel
            </Button>
            <Button onClick={handleAssignTechnician} isLoading={actionLoading !== null} disabled={!selectedTechnician || actionLoading !== null}>
              Assign
            </Button>
          </>
        }
      >
        <select
          value={selectedTechnician}
          onChange={(e) => setSelectedTechnician(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all"
        >
          <option value="">Select technician...</option>
          {technicians.map((tech) => {
            const activeCount = complaints.filter(c =>
              c.assignedTo?._id === tech._id && ["ASSIGNED", "IN_PROGRESS"].includes(c.status)
            ).length;
            return (
              <option key={tech._id} value={tech._id}>
                {tech.fullName}{activeCount > 0 ? ` (${activeCount} active task${activeCount > 1 ? 's' : ''})` : ' (available)'}
              </option>
            );
          })}
        </select>
      </Modal>

      {/* Priority Modal */}
      <Modal
        isOpen={priorityTarget !== null}
        onClose={() => setPriorityTarget(null)}
        title="Update Priority"
        description="Set a priority score from 1 (lowest) to 10 (highest)."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPriorityTarget(null)} disabled={actionLoading !== null}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePriority} isLoading={actionLoading !== null}>
              Update
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <input
            type="number"
            min="1"
            max="10"
            value={priorityScore}
            onChange={(e) => setPriorityScore(parseInt(e.target.value) || 5)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPriorityScore(n)}
                className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all hover:scale-110 ${
                  n <= priorityScore
                    ? n >= 8 ? "bg-red-500 text-white" : n >= 5 ? "bg-amber-500 text-white" : "bg-primary text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Assign Technician Confirmation */}
      <ConfirmationModal
        isOpen={confirmAction.type === "assignTech"}
        onClose={() => setConfirmAction({ type: null, targetId: null, targetName: "" })}
        onConfirm={() => {
          if (confirmAction.targetId && selectedTechnician) {
            handleAssignTechnician();
          }
          setConfirmAction({ type: null, targetId: null, targetName: "" });
        }}
        title="Assign Technician"
        message={`Are you sure you want to assign ${complaints.find(c => c._id === confirmAction.targetId)?.title || "this complaint"} to the selected technician?`}
        confirmText="Assign"
        variant="warning"
        isLoading={actionLoading !== null}
      />
    </div>
    </DashboardLayout>
  );
}
