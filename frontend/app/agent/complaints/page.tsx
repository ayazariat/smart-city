"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle, XCircle, Building, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { agentService } from "@/services/agent.service";
import { Complaint } from "@/types";
import { categoryLabels } from "@/lib/complaints";
import {
  PageHeader,
  FilterBar,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
  Modal,
  Button,
} from "@/components/ui";

export default function AgentComplaintsPage() {
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const refreshComplaints = async () => {
    const response = await agentService.getAgentComplaints({ status: statusFilter || undefined });
    if (response.data) setComplaints(response.data.complaints);
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
          limit: 50,
          status: statusFilter || undefined,
        });
        if (response.data?.complaints) setComplaints(response.data.complaints);
      } catch (err) {
        console.error("Error fetching complaints:", err);
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

  const filteredComplaints = complaints.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  // Stats
  const submitted = complaints.filter(c => c.status === "SUBMITTED").length;
  const validated = complaints.filter(c => c.status === "VALIDATED").length;
  const total = complaints.length;

  if (!user || user.role !== "MUNICIPAL_AGENT") return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="Agent Dashboard"
        subtitle="Manage and process citizen complaints"
        backHref="/dashboard"
        variant="hero"
        rightContent={
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <div className="text-xs text-white/70">Total</div>
              <div className="text-xl font-bold text-white">{total}</div>
            </div>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{submitted}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp delay-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Validated</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{validated}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp delay-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">All Complaints</p>
                <p className="text-3xl font-bold text-primary mt-1">{total}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

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
        onClose={() => { setAssignTarget(null); setSelectedDepartment(""); }}
        title="Assign to Department"
        description="Select the department that will handle this complaint."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAssignTarget(null); setSelectedDepartment(""); }} disabled={actionLoading !== null}>
              Cancel
            </Button>
            <Button onClick={handleAssign} isLoading={actionLoading !== null} disabled={!selectedDepartment || actionLoading !== null}>
              Assign
            </Button>
          </>
        }
      >
        <div className="space-y-3">
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

      <main className="max-w-7xl mx-auto px-4 py-6">
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          count={filteredComplaints.length}
        />

        {loading && <LoadingSpinner />}

        {!loading && (
          filteredComplaints.length === 0 ? (
            <EmptyState
              icon="file"
              message={
                searchTerm || statusFilter
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
                              onClick={() => handleValidate(id)}
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
                            onClick={() => setAssignTarget(id)}
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
    </div>
  );
}
