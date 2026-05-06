"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, TrendingUp, Clock, CheckCircle, Lock, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { Complaint } from "@/types";
import { categoryLabels } from "@/lib/complaints";
import { getCategoryLabel } from "@/lib/categories";
import { useLastVisitedPage } from "@/hooks/useLastVisitedPage";
import {
  PageHeader,
  FilterBar,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
} from "@/components/ui";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function MyComplaintsPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const { isHydrated, saveLastPage, getLastPage, clearLastPage } = useLastVisitedPage();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(""); // "ALL", "ACTIVE", "RESOLVED", "CLOSED", "REJECTED" or empty

  const citizenStatusOptions = [
    { value: "", label: "All" },
    { value: "ACTIVE", label: "Active" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
    { value: "REJECTED", label: "Rejected" },
  ];

  useEffect(() => {
    if (isHydrated) saveLastPage("/my-complaints");
  }, [isHydrated, saveLastPage]);

  useEffect(() => {
    if (!hydrated || !isHydrated) return;
    if (!user) { router.push("/"); return; }
    if (user.role !== "CITIZEN") { router.push("/dashboard"); return; }

    const lastPage = getLastPage();
    if (lastPage && lastPage !== "/my-complaints" && lastPage.startsWith("/my-complaints/")) {
      clearLastPage();
      router.push(lastPage);
    }
  }, [user, router, hydrated, isHydrated, getLastPage, clearLastPage]);

  useEffect(() => {
    const fetchMyComplaints = async () => {
      if (!hydrated || !user || user.role !== "CITIZEN") {
        return;
      }
       try {
        setLoading(true);
        const response = await complaintService.getMyComplaints({
          page: 1,
          limit: 50,
        });
        if (response && Array.isArray(response.complaints)) {
          setComplaints(response.complaints);
        } else {
          setComplaints([]);
        }
      } catch (err: unknown) {
        console.error("Error fetching complaints:", err);
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyComplaints();
  }, [user, statusFilter, hydrated]);

  const filteredComplaints = complaints.filter((c) => {
    // Status filter
    const status = c.status as string;
    if (statusFilter === "ACTIVE") {
      if (!["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"].includes(status)) return false;
    } else if (statusFilter === "RESOLVED") {
      if (status !== "RESOLVED") return false;
    } else if (statusFilter === "CLOSED") {
      if (status !== "CLOSED") return false;
    } else if (statusFilter === "REJECTED") {
      if (status !== "REJECTED") return false;
    }
    // Search filter
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  // Stats (excluding closed/archived for active counts)
  const activeComplaints = complaints.filter(c => {
    const s = c.status as string;
    return s !== "CLOSED" && s !== "REJECTED" && s !== "ARCHIVED";
  });
  const submitted = activeComplaints.filter(c => c.status === "SUBMITTED").length;
  const inProgress = activeComplaints.filter(c => ["VALIDATED", "ASSIGNED", "IN_PROGRESS"].includes(c.status)).length;
  const resolved = activeComplaints.filter(c => c.status === "RESOLVED").length;
  const closed = complaints.filter(c => c.status === "CLOSED").length;
  const rejected = complaints.filter(c => c.status === "REJECTED").length;
  const total = complaints.length;

  if (!hydrated) return <LoadingSpinner fullScreen />;
  if (!user || user.role !== "CITIZEN") return null;

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="My Complaints"
        subtitle="Track and manage your submitted complaints"
        backHref="/dashboard"
        rightContent={
          <Link
            href="/complaints/new"
            className="flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4" />
            New
          </Link>
        }
      />

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200 animate-fadeInUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Submitted</p>
                <p className="text-xl font-bold text-slate-800">{submitted}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200 animate-fadeInUp delay-75">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">In Progress</p>
                <p className="text-xl font-bold text-slate-800">{inProgress}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200 animate-fadeInUp delay-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Resolved</p>
                <p className="text-xl font-bold text-slate-800">{resolved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200 animate-fadeInUp delay-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-xl font-bold text-slate-800">{total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200 animate-fadeInUp delay-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Closed</p>
                <p className="text-xl font-bold text-slate-800">{closed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4 border border-red-200 animate-fadeInUp delay-400">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-600">Rejected</p>
                <p className="text-xl font-bold text-red-700">{rejected}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
         <FilterBar
           searchTerm={searchTerm}
           onSearchChange={setSearchTerm}
           statusFilter={statusFilter}
           onStatusChange={setStatusFilter}
           statusOptions={citizenStatusOptions}
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
                  : "You haven't submitted any complaints yet."
              }
              action={
                <Link
                  href="/complaints/new"
                  className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-4 h-4" />
                  Submit New Complaint
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5">
              {filteredComplaints.map((complaint, index) => (
                <ComplaintCard
                  key={complaint._id || complaint.id}
                  complaint={complaint}
                  href={`/my-complaints/${complaint._id || complaint.id}`}
                  index={index}
                  hideSla
                  onUpdate={(updated) => {
                    setComplaints((prev): Complaint[] =>
                      prev.map((c): Complaint => {
                        const updatedId = updated._id ?? updated.id;
                        const currentId = c._id ?? c.id;
                        if (updatedId && currentId && currentId === updatedId) {
                          const category = (updated.category ?? c.category) as Complaint["category"];
                          const status = (updated.status ?? c.status) as Complaint["status"];
                          const urgency = (updated.urgency ?? c.urgency) as Complaint["urgency"];
                          const media = (updated.media ?? c.media ?? []).map((m) => ({
                            url: m.url,
                            type: (m.type ?? "photo") as "photo" | "video",
                          }));
                          const createdBy = (() => {
                            if (typeof updated.createdBy === "string") return updated.createdBy;
                            if (
                              updated.createdBy &&
                              typeof updated.createdBy === "object" &&
                              "_id" in updated.createdBy &&
                              typeof updated.createdBy._id === "string" &&
                              "fullName" in updated.createdBy &&
                              typeof updated.createdBy.fullName === "string" &&
                              "email" in updated.createdBy &&
                              typeof updated.createdBy.email === "string"
                            ) {
                              const phone =
                                "phone" in updated.createdBy &&
                                typeof updated.createdBy.phone === "string"
                                  ? updated.createdBy.phone
                                  : undefined;

                              return {
                                _id: updated.createdBy._id,
                                fullName: updated.createdBy.fullName,
                                email: updated.createdBy.email,
                                phone,
                              } satisfies Complaint["createdBy"];
                            }
                            return c.createdBy;
                          })();
                          const citizen = (() => {
                            if (!("citizen" in updated)) return c.citizen;
                            const citizenVal = updated.citizen;
                            if (citizenVal === null) return null;
                            if (
                              citizenVal &&
                              typeof citizenVal === "object" &&
                              "_id" in citizenVal &&
                              typeof citizenVal._id === "string" &&
                              "email" in citizenVal &&
                              typeof citizenVal.email === "string"
                            ) {
                              const phone =
                                "phone" in citizenVal && typeof citizenVal.phone === "string"
                                  ? citizenVal.phone
                                  : undefined;

                              return {
                                _id: citizenVal._id,
                                fullName: citizenVal.fullName,
                                email: citizenVal.email,
                                phone,
                              } as Complaint["citizen"];
                            }
                            return c.citizen;
                          })();
                          const department = (() => {
                            if (!("department" in updated)) return c.department;
                            const departmentVal = updated.department;
                            if (departmentVal === null) return undefined;
                            if (
                              departmentVal &&
                              typeof departmentVal === "object" &&
                              "_id" in departmentVal &&
                              typeof departmentVal._id === "string" &&
                              "name" in departmentVal &&
                              typeof departmentVal.name === "string"
                            ) {
                              return {
                                _id: departmentVal._id,
                              name: departmentVal.name,
                            } as Complaint["department"];
                          }
                          return c.department;
                          })();
                          const assignedTo = (() => {
                            if (!("assignedTo" in updated)) return c.assignedTo;
                            const assignedVal = updated.assignedTo;
                            if (
                              assignedVal &&
                              typeof assignedVal === "object" &&
                              "_id" in assignedVal &&
                              typeof assignedVal._id === "string" &&
                              "fullName" in assignedVal &&
                              typeof assignedVal.fullName === "string" &&
                              "email" in assignedVal &&
                              typeof assignedVal.email === "string"
                            ) {
                              return {
                                _id: assignedVal._id,
                                fullName: assignedVal.fullName,
                                email: assignedVal.email,
                              } as Complaint["assignedTo"];
                            }
                            return c.assignedTo;
                          })();
                          return {
                            ...c,
                            ...updated,
                            category,
                            status,
                            urgency,
                            media,
                            createdBy,
                            citizen,
                            department,
                            assignedTo,
                            assignedDepartment: ((updated as unknown as Record<string, unknown>).assignedDepartment ?? undefined) as Complaint['assignedDepartment'],
                          };
                        }
                        return c;
                      })
                    );
                  }}
                />
              ))}
            </div>
          )
        )}
      </main>
    </div>
    </DashboardLayout>
  );
}
