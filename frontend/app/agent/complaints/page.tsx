"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, CheckCircle, XCircle, Building, TrendingUp,
  Clock, AlertTriangle, Filter, Download, Search
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { agentService } from "@/services/agent.service";
import { Complaint } from "@/types";
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

export default function AgentComplaintsPage() {
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [municipalityName, setMunicipalityName] = useState<string>("");
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<{ departmentId?: string; departmentName?: string; confidence?: number } | null>(null);

  // Confirmation modal states
  const [confirmAction, setConfirmAction] = useState<{
    type: "validate" | "reject" | "assign" | null;
    targetId: string | null;
    targetName: string;
  }>({ type: null, targetId: null, targetName: "" });

  const refreshComplaints = async () => {
    const response = await agentService.getAgentComplaints({ status: statusFilter === "ACTIVE" ? "SUBMITTED,VALIDATED,ASSIGNED,IN_PROGRESS,RESOLVED" : (statusFilter || "ALL") });
    if (response.data) {
      setComplaints(response.data.complaints);
      if (response.data.municipalityName) {
        setMunicipalityName(response.data.municipalityName);
      }
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.push("/");
  }, [hydrated, token, router]);

  useEffect(() => {
    const fetch = async () => {
      if (!hydrated || !token || !user || user.role !== "MUNICIPAL_AGENT") return;
      try {
        setLoading(true);
        const response = await agentService.getAgentComplaints({
          page: 1,
          limit: 100,
          status: statusFilter === "ACTIVE" ? "SUBMITTED,VALIDATED,ASSIGNED,IN_PROGRESS,RESOLVED" : (statusFilter || "ALL"),
        });
        if (response.data?.complaints) {
          setComplaints(response.data.complaints);
          if (response.data.municipalityName) {
            setMunicipalityName(response.data.municipalityName);
          }
        }
      } catch (err: unknown) {
        console.error("Error fetching complaints:", err);
        const error = err as { message?: string };
        if (error.message?.includes("Municipality not configured")) {
          alert("Your account doesn't have a municipality configured. Please contact an administrator.");
        }
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [hydrated, token, user, statusFilter]);

  useEffect(() => {
    const fetchDepts = async () => {
      if (!hydrated || !token || !user || user.role !== "MUNICIPAL_AGENT") return;
      try {
        const response = await agentService.getAgentDepartments();
        if (response.data && Array.isArray(response.data)) {
          setDepartments(response.data);
        }
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };
    fetchDepts();
  }, [hydrated, token, user]);

  const handleValidate = async (complaintId: string) => {
    setConfirmAction({ type: null, targetId: null, targetName: "" });
    setActionLoading(complaintId);
    try {
      await agentService.validateComplaint(complaintId);
      await refreshComplaints();
    } catch (err) {
      console.error("Error validating:", err);
      alert("Failed to validate complaint");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmValidate = () => {
    if (confirmAction.targetId) {
      handleValidate(confirmAction.targetId);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason) return;
    setActionLoading(rejectTarget);
    try {
      await agentService.rejectComplaint(rejectTarget, rejectReason);
      setRejectTarget(null);
      setRejectReason("");
      await refreshComplaints();
    } catch (err) {
      console.error("Error rejecting:", err);
      alert("Failed to reject complaint");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async () => {
    if (!assignTarget || !selectedDepartment) return;
    setActionLoading(assignTarget);
    try {
        const result = await agentService.assignComplaintToDepartment(assignTarget, selectedDepartment);
      if (result.success) {
        setAssignTarget(null);
        setSelectedDepartment("");
        setAiSuggestion(null);
        await refreshComplaints();
      } else {
        alert((result as { message?: string }).message || "Failed to assign complaint");
      }
    } catch (err: unknown) {
      console.error("Error assigning:", err);
      const errorObj = err as { message?: string };
      alert(errorObj?.message || "Failed to assign complaint");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter complaints based on all filters
  const filteredComplaints = complaints.filter((c) => {
    if (categoryFilter && c.category !== categoryFilter) return false;
    if (priorityFilter) {
      if (priorityFilter === "HIGH" && (c.priorityScore || 0) < 15) return false;
      if (priorityFilter === "MEDIUM" && ((c.priorityScore || 0) < 6 || (c.priorityScore || 0) >= 15)) return false;
      if (priorityFilter === "LOW" && (c.priorityScore || 0) >= 6) return false;
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  // Calculate statistics
  const overdueCount = complaints.filter(c => {
    const daysSinceCreation = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return ["ASSIGNED", "IN_PROGRESS"].includes(c.status) && daysSinceCreation > 7;
  }).length;
  
  const atRiskCount = complaints.filter(c => {
    const daysSinceCreation = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return ["ASSIGNED", "IN_PROGRESS"].includes(c.status) && daysSinceCreation > 4 && daysSinceCreation <= 7;
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
      c.referenceId || c._id?.slice(-6),
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
    a.download = `agent_complaints_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    // Create printable content
    const content = filteredComplaints.map(c => 
      `${c.referenceId || c._id?.slice(-6)} | ${c.title || c.description?.slice(0, 50)} | ${c.status} | ${categoryLabels[c.category] || c.category} | ${c.municipalityName || ""}`
    ).join("\n");
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Complaints Report</title>
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
            <h1>Agent Complaints Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Municipality: ${municipalityName || "All"}</p>
            <p>Total: ${filteredComplaints.length} complaints</p>
            <table>
              <tr><th>Reference</th><th>Title</th><th>Status</th><th>Category</th><th>Municipality</th></tr>
              ${filteredComplaints.map(c => `
                <tr>
                  <td>${c.referenceId || c._id?.slice(-6)}</td>
                  <td>${(c.title || c.description || "").slice(0, 50)}</td>
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

  if (!user || user.role !== "MUNICIPAL_AGENT") return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="My Actions"
        subtitle={municipalityName ? `Complaints in ${municipalityName}` : "Agent complaint management"}
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
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Team Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{complaints.filter(c => c.status === "IN_PROGRESS").length}</p>
              <p className="text-xs text-slate-500 mt-1">In Progress</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <p className="text-2xl font-bold text-purple-600">{avgDays}</p>
              <p className="text-xs text-slate-500 mt-1">Avg Days</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-2xl font-bold text-emerald-600">{resolutionRate}%</p>
              <p className="text-xs text-slate-500 mt-1">Resolution Rate</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <p className="text-2xl font-bold text-orange-600">{highPriorityCount}</p>
              <p className="text-xs text-slate-500 mt-1">High Priority</p>
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
                  <option value="ACTIVE">Active (My Actions)</option>
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">All Categories</option>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
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
                searchTerm || statusFilter || categoryFilter || priorityFilter
                  ? "Try adjusting your search or filters."
                  : "No complaints assigned to you yet."
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
                    showDepartment
                    showMunicipality
                    index={index}
                    actions={
                      <>
                        {complaint.status === "SUBMITTED" && (
                          <>
                            <button
                              onClick={() => { const c = complaints.find(x => (x._id || x.id) === id); setConfirmAction({ type: "validate", targetId: id, targetName: c?.title || " Complaint" }); }}
                              disabled={actionLoading === id}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-primary/25"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {actionLoading === id ? "Validating..." : "Validate"}
                            </button>
                            <button
                              onClick={() => setRejectTarget(id)}
                              disabled={actionLoading === id}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all text-sm font-medium disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                        {complaint.status === "VALIDATED" && !complaint.assignedDepartment && (
                          <button
                            onClick={() => {
                              setAssignTarget(id);
                              // Fetch AI prediction
                              const c = complaints.find(x => (x._id || x.id) === id);
                              if (c) {
                                agentService.predictDepartment(c.category, c.description || "", c.municipalityName || "")
                                  .then(res => {
                                    if (res.data) {
                                      setAiSuggestion({ departmentId: res.data.suggestedDepartment, departmentName: res.data.departmentName, confidence: res.data.confidence });
                                      if (res.data.suggestedDepartment) setSelectedDepartment(res.data.suggestedDepartment);
                                    }
                                  })
                                  .catch(() => {});
                              }
                            }}
                            disabled={actionLoading === id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all text-sm font-semibold disabled:opacity-50 hover:shadow-lg"
                          >
                            <Building className="w-4 h-4" />
                            Assign Department
                          </button>
                        )}
                        {complaint.status === "VALIDATED" && complaint.assignedDepartment && (
                          <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-100 text-green-700 rounded-xl text-sm font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            {typeof complaint.assignedDepartment === 'object' && complaint.assignedDepartment.name 
                              ? `Assigned to ${complaint.assignedDepartment.name}` 
                              : 'Department Assigned'}
                          </div>
                        )}
                        {complaint.status === "RESOLVED" && (
                          <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-700 rounded-xl text-sm font-semibold">
                            <AlertTriangle className="w-4 h-4" />
                            Resolution Pending Review
                          </div>
                        )}
                        <button
                          onClick={() => router.push(`/dashboard/complaints/${id}?from=agent`)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          View Details
                        </button>
                      </>
                    }
                  />
                );
              })}
            </div>
          )
        )}
      </main>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectTarget !== null}
        onClose={() => { setRejectTarget(null); setRejectReason(""); }}
        title="Reject Complaint"
        description="Please provide a reason for rejecting this complaint."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRejectTarget(null); setRejectReason(""); }} disabled={actionLoading !== null}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} isLoading={actionLoading !== null} disabled={!rejectReason || actionLoading !== null}>
              Reject
            </Button>
          </>
        }
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
          rows={4}
          placeholder="Enter rejection reason..."
        />
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={assignTarget !== null}
        onClose={() => { setAssignTarget(null); setSelectedDepartment(""); setAiSuggestion(null); }}
        title="Assign to Department"
        description="Select the department that will handle this complaint."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAssignTarget(null); setSelectedDepartment(""); setAiSuggestion(null); }} disabled={actionLoading !== null}>
              Cancel
            </Button>
            <Button onClick={handleAssign} isLoading={actionLoading !== null} disabled={!selectedDepartment || actionLoading !== null}>
              Assign
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {aiSuggestion?.departmentName && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-sm font-medium text-blue-800">AI suggests: {aiSuggestion.departmentName}</span>
              <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full font-semibold">{aiSuggestion.confidence}%</span>
            </div>
          )}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all"
          >
            <option value="">Select department...</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Validate Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmAction.type === "validate"}
        onClose={() => setConfirmAction({ type: null, targetId: null, targetName: "" })}
        onConfirm={handleConfirmValidate}
        title="Validate Complaint"
        message={`Are you sure you want to validate this complaint "${confirmAction.targetName}"? It will be sent for department assignment.`}
        confirmText="Validate"
        variant="success"
        isLoading={actionLoading !== null}
      />

      {/* Assign Department Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmAction.type === "assign"}
        onClose={() => setConfirmAction({ type: null, targetId: null, targetName: "" })}
        onConfirm={() => {
          setConfirmAction({ type: null, targetId: null, targetName: "" });
          handleAssign();
        }}
        title="Assign to Department"
        message={`Are you sure you want to assign this complaint "${confirmAction.targetName}" to the selected department?`}
        confirmText="Assign"
        variant="warning"
        isLoading={actionLoading !== null}
      />
    </div>
  );
}
