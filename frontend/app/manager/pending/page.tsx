"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Wrench, Flag, TrendingUp, Users } from "lucide-react";
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

  const [assignTechTarget, setAssignTechTarget] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState("");

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

  const filteredComplaints = complaints.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  // Stats
  const assigned = complaints.filter(c => c.status === "ASSIGNED").length;
  const inProgress = complaints.filter(c => c.status === "IN_PROGRESS").length;
  const total = complaints.length;

  if (!user || user.role !== "DEPARTMENT_MANAGER") return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="Manager Dashboard"
        subtitle="Manage department complaints and technicians"
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
                <p className="text-sm text-slate-500 font-medium">Pending Assignment</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{assigned}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp delay-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">In Progress</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
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
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

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
          {technicians.map((tech) => (
            <option key={tech._id} value={tech._id}>{tech.fullName}</option>
          ))}
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
    </div>
  );
}
