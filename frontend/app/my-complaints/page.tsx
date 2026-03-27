"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { Complaint } from "@/types";
import { categoryLabels } from "@/lib/complaints";
import { useLastVisitedPage } from "@/hooks/useLastVisitedPage";
import {
  PageHeader,
  FilterBar,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
} from "@/components/ui";

export default function MyComplaintsPage() {
  const router = useRouter();
  const { user, logout, hydrated } = useAuthStore();
  const { isHydrated, saveLastPage, getLastPage, clearLastPage } = useLastVisitedPage();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

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
          status: statusFilter || undefined,
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
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  // Stats
  const submitted = complaints.filter(c => c.status === "SUBMITTED").length;
  const inProgress = complaints.filter(c => ["VALIDATED", "ASSIGNED", "IN_PROGRESS"].includes(c.status)).length;
  const resolved = complaints.filter(c => ["RESOLVED", "CLOSED"].includes(c.status)).length;
  const total = complaints.length;

  if (!hydrated) return <LoadingSpinner fullScreen />;
  if (!user || user.role !== "CITIZEN") return null;

  return (
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
                <TrendingUp className="w-5 h-5 text-blue-600" />
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
        </div>
      </div>

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
                  onUpdate={(updated) => {
                    setComplaints(prev => prev.map(c => 
                      (c._id || c.id) === (updated._id || updated.id) ? updated as any : c
                    ));
                  }}
                />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
