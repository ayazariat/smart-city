"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Wrench, Flag } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { managerService } from "@/services/manager.service";
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
import type { BaseComplaint } from "@/components/ui";

// Local manager complaint shape
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
  const [technicians, setTechnicians] = useState<Array<{ _id: string; fullName: string }>>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Assign technician modal
  const [assignTechTarget, setAssignTechTarget] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState("");

  // Priority modal
  const [priorityTarget, setPriorityTarget] = useState<string | null>(null);
  const [priorityScore, setPriorityScore] = useState<number>(5);

  useEffect(() => {
    if (!token) router.push("/");
  }, [token, router]);

  const refreshComplaints = async () => {
    const response = await managerService.getManagerComplaints({ status: statusFilter || undefined });
    if (response.data) setComplaints(response.data.complaints);
  };

  useEffect(() => {
    const fetch = async () => {
      if (!token || !user || user.role !== "DEPARTMENT_MANAGER") return;
      try {
        setLoading(true);
        const response = await managerService.getManagerComplaints({
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
      await managerService.assignTechnician(assignTechTarget, selectedTechnician);
      setAssignTechTarget(null);
      setSelectedTechnician("");
      await refreshComplaints();
    } catch (err) {
      console.error("Error assigning technician:", err);
      alert("Failed to assign technician");
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

  const filteredComplaints = complaints.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  if (!user || user.role !== "DEPARTMENT_MANAGER") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      <PageHeader
        title="Manager Dashboard"
        backHref="/dashboard"
        rightContent={
          <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
            {filteredComplaints.length} complaints
          </span>
        }
      />

      {/* ── Assign Technician Modal ── */}
      <Modal
        isOpen={assignTechTarget !== null}
        onClose={() => { setAssignTechTarget(null); setSelectedTechnician(""); }}
        title="Assign to Technician"
        description="Select the technician who will handle this complaint."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAssignTechTarget(null); setSelectedTechnician(""); }}
              disabled={actionLoading !== null}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssignTechnician}
              isLoading={actionLoading !== null}
              disabled={!selectedTechnician || actionLoading !== null}
            >
              Assign
            </Button>
          </>
        }
      >
        <select
          value={selectedTechnician}
          onChange={(e) => setSelectedTechnician(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        >
          <option value="">Select technician…</option>
          {technicians.map((tech) => (
            <option key={tech._id} value={tech._id}>{tech.fullName}</option>
          ))}
        </select>
      </Modal>

      {/* ── Priority Modal ── */}
      <Modal
        isOpen={priorityTarget !== null}
        onClose={() => setPriorityTarget(null)}
        title="Update Priority"
        description="Set a priority score from 1 (lowest) to 10 (highest)."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPriorityTarget(null)}
              disabled={actionLoading !== null}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdatePriority}
              isLoading={actionLoading !== null}
              disabled={actionLoading !== null}
            >
              Update
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            type="number"
            min="1"
            max="10"
            value={priorityScore}
            onChange={(e) => setPriorityScore(parseInt(e.target.value) || 5)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {/* Visual scale */}
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPriorityScore(n)}
                className={`flex-1 h-6 rounded text-xs font-medium transition-colors ${
                  n <= priorityScore
                    ? n >= 8 ? "bg-urgent text-white" : n >= 5 ? "bg-attention text-white" : "bg-primary text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
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
              message={
                searchTerm || statusFilter
                  ? "Try adjusting your search or filters."
                  : "No complaints pending for your department."
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
                    showAssignedTo
                    showPriority
                    actions={
                      <>
                        {complaint.status === "ASSIGNED" && !complaint.assignedTo && (
                          <button
                            onClick={() => setAssignTechTarget(id)}
                            disabled={actionLoading === id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <Wrench className="w-4 h-4" />
                            Assign Technician
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPriorityTarget(id);
                            setPriorityScore(complaint.priorityScore ?? 5);
                          }}
                          disabled={actionLoading === id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-attention text-white rounded-xl hover:bg-attention-600 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <Flag className="w-4 h-4" />
                          Update Priority
                        </button>
                        <Link
                          href={`/dashboard/complaints/${id}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          View Details
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
    </div>
  );
}
