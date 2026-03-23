"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { complaintService } from "@/services/complaint.service";
import { Complaint } from "@/types";
import { categoryLabels } from "@/lib/complaints";
import {
  PageHeader,
  FilterBar,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
} from "@/components/ui";

const ALLOWED_ROLES = ["MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "ADMIN", "TECHNICIAN"] as const;

export default function DashboardComplaintsPage() {
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Guard: redirect if not authorised
  useEffect(() => {
    if (!hydrated) return;
    if (!token) { router.push("/"); return; }
    if (user && !ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) {
      router.push("/dashboard");
    }
  }, [token, user, router, hydrated]);

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!hydrated || !token || !user) return;
      if (!ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) return;

      try {
        setLoading(true);
        const response = await complaintService.getAllComplaints({ page: 1, limit: 50 });
        setComplaints(response.data?.complaints ?? []);
      } catch (err) {
        console.error("Error fetching complaints:", err);
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [token, user, hydrated]);

  const filteredComplaints = complaints.filter((c) => {
    // Apply status filter
    if (statusFilter && c.status !== statusFilter) return false;
    
    // Apply search filter
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q) ||
      c._id?.includes(searchTerm)
    );
  });

  if (!hydrated) return <LoadingSpinner fullScreen />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      <PageHeader
        title="Complaint Management"
        backHref="/dashboard"
        rightContent={
          <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
            {filteredComplaints.length} complaints
          </span>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          searchPlaceholder="Search by description, category or ID…"
          count={filteredComplaints.length}
        />

        {loading && <LoadingSpinner />}

        {!loading && (
          filteredComplaints.length === 0 ? (
            <EmptyState
              message={
                searchTerm || statusFilter
                  ? "Try adjusting your search or filters."
                  : "No complaints have been submitted yet."
              }
            />
          ) : (
            <div className="grid gap-4">
              {filteredComplaints.map((complaint) => {
                const fromParam = user?.role === "MUNICIPAL_AGENT" ? "agent" 
                  : user?.role === "DEPARTMENT_MANAGER" ? "manager"
                  : user?.role === "ADMIN" ? "admin"
                  : user?.role === "TECHNICIAN" ? "tasks" : "";
                return (
                <ComplaintCard
                  key={complaint._id || complaint.id}
                  complaint={complaint}
                  href={`/dashboard/complaints/${complaint._id || complaint.id}${fromParam ? `?from=${fromParam}` : ''}`}
                  showCitizen
                  showDepartment
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
