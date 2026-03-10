"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  CheckCircle,
  XCircle,
  Building,
} from "lucide-react";
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
  const { user, token } = useAuthStore();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Assign modal state
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  useEffect(() => {
    if (!token) router.push("/");
  }, [token, router]);

  const refreshComplaints = async () => {
    const response = await agentService.getAgentComplaints({ status: statusFilter || undefined });
    if (response.data) setComplaints(response.data.complaints);
  };

  useEffect(() => {
    const fetch = async () => {
      if (!token || !user || user.role !== "MUNICIPAL_AGENT") return;
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
  }, [token, user, statusFilter]);

  useEffect(() => {
    const fetchDepts = async () => {
      if (!token || !user || user.role !== "MUNICIPAL_AGENT") return;
      try {
        const response = await agentService.getAgentDepartments();
        if (response.data) setDepartments(response.data);
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };
    fetchDepts();
  }, [token, user]);

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
      await agentService.assignComplaintToDepartment(assignTarget, selectedDepartment);
      setAssignTarget(null);
      setSelectedDepartment("");
      await refreshComplaints();
    } catch (err) {
      console.error("Error assigning:", err);
      alert("Failed to assign complaint");
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

  if (!user || user.role !== "MUNICIPAL_AGENT") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      <PageHeader
        title="Agent Dashboard"
        backHref="/dashboard"
        rightContent={
          <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
            {filteredComplaints.length} complaints
          </span>
        }
      />

      {/* ── Reject Modal ── */}
      <Modal
        isOpen={rejectTarget !== null}
        onClose={() => { setRejectTarget(null); setRejectReason(""); }}
        title="Reject Complaint"
        description="Please provide a reason for rejecting this complaint."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setRejectTarget(null); setRejectReason(""); }}
              disabled={actionLoading !== null}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleReject}
              isLoading={actionLoading !== null}
              disabled={!rejectReason || actionLoading !== null}
            >
              Reject
            </Button>
          </>
        }
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          rows={3}
          placeholder="Enter rejection reason…"
        />
      </Modal>

      {/* ── Assign Modal ── */}
      <Modal
        isOpen={assignTarget !== null}
        onClose={() => { setAssignTarget(null); setSelectedDepartment(""); }}
        title="Assign to Department"
        description="Select the department that will handle this complaint."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAssignTarget(null); setSelectedDepartment(""); }}
              disabled={actionLoading !== null}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssign}
              isLoading={actionLoading !== null}
              disabled={!selectedDepartment || actionLoading !== null}
            >
              Assign
            </Button>
          </>
        }
      >
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        >
          <option value="">Select department…</option>
          {departments.map((dept) => (
            <option key={dept._id} value={dept._id}>{dept.name}</option>
          ))}
        </select>
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
              message={
                searchTerm || statusFilter
                  ? "Try adjusting your search or filters."
                  : "No complaints assigned to you yet."
              }
            />
          ) : (
            <div className="grid gap-4">
              {filteredComplaints.map((complaint) => {
                const id = complaint._id || complaint.id || "";

                return (
                  <ComplaintCard
                    key={id}
                    complaint={complaint}
                    showCitizen
                    showDepartment
                    actions={
                      complaint.status === "SUBMITTED" ? (
                        <>
                          <button
                            onClick={() => handleValidate(id)}
                            disabled={actionLoading === id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {actionLoading === id ? "Validating…" : "Validate"}
                          </button>
                          <button
                            onClick={() => setRejectTarget(id)}
                            disabled={actionLoading === id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-urgent text-white rounded-xl hover:bg-urgent-600 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      ) : complaint.status === "VALIDATED" ? (
                        <button
                          onClick={() => setAssignTarget(id)}
                          disabled={actionLoading === id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <Building className="w-4 h-4" />
                          Assign to Department
                        </button>
                      ) : (
                        <Link
                          href={`/dashboard/complaints/${id}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          View Details
                        </Link>
                      )
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
