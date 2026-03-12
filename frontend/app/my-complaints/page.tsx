"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
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
  const { user, token, logout, hydrated } = useAuthStore();
  const { isHydrated, saveLastPage, getLastPage, clearLastPage } = useLastVisitedPage();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Persist last-visited page
  useEffect(() => {
    if (isHydrated) saveLastPage("/my-complaints");
  }, [isHydrated, saveLastPage]);

  // Auth guard + redirect to last complaint detail page if applicable
  useEffect(() => {
    if (!hydrated || !isHydrated) return;
    if (!token) { router.push("/"); return; }
    if (user && user.role !== "CITIZEN") { router.push("/dashboard"); return; }

    const lastPage = getLastPage();
    if (lastPage && lastPage !== "/my-complaints" && lastPage.startsWith("/my-complaints/")) {
      clearLastPage();
      router.push(lastPage);
    }
  }, [token, user, router, hydrated, isHydrated, getLastPage, clearLastPage]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Fetch complaints
  useEffect(() => {
    const fetchMyComplaints = async () => {
      if (!hydrated || !token || !user || user.role !== "CITIZEN") return;
      try {
        setLoading(true);
        const response = await complaintService.getMyComplaints({
          page: 1,
          limit: 50,
          status: statusFilter || undefined,
        });
        setComplaints(response.complaints ?? []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("auth")) {
          await handleLogout();
        }
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyComplaints();
  }, [token, user, statusFilter, hydrated]);

  const filteredComplaints = complaints.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  if (!hydrated) return <LoadingSpinner fullScreen />;
  if (!user || user.role !== "CITIZEN") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      <PageHeader
        title="My Complaints"
        backHref="/dashboard"
        rightContent={
          <Link
            href="/complaints/new"
            className="flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-xl font-medium text-sm hover:bg-primary-50 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Complaint
          </Link>
        }
      />

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
                  : "You haven't submitted any complaints yet."
              }
              action={
                <Link
                  href="/complaints/new"
                  className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-700 transition-all text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Submit New Complaint
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4">
              {filteredComplaints.map((complaint) => (
                <ComplaintCard
                  key={complaint._id || complaint.id}
                  complaint={complaint}
                  href={`/my-complaints/${complaint._id || complaint.id}`}
                />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
