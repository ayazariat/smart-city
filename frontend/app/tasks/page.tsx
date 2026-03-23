"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Wrench,
  Camera,
  MapPin,
  Loader2,
  Search,
  Filter,
  Bell,
  X,
  User,
  Calendar,
  Building,
  ChevronRight,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { technicianService } from "@/services/technician.service";
import { notificationService } from "@/services/notification.service";
import { Complaint, Notification } from "@/types";
import { showToast } from "@/components/ui/Toast";
import { Button, Modal, PageHeader } from "@/components/ui";

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string }> = {
  ASSIGNED: { label: "Assigned", bgClass: "bg-primary/10", textClass: "text-primary", borderClass: "border-primary/20" },
  IN_PROGRESS: { label: "In Progress", bgClass: "bg-orange-100", textClass: "text-orange-700", borderClass: "border-orange-200" },
  RESOLVED: { label: "Resolved", bgClass: "bg-green-100", textClass: "text-green-700", borderClass: "border-green-200" },
  CLOSED: { label: "Closed", bgClass: "bg-slate-100", textClass: "text-slate-600", borderClass: "border-slate-200" },
};

const urgencyConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  LOW: { label: "Low", bgClass: "bg-green-100", textClass: "text-green-700" },
  MEDIUM: { label: "Medium", bgClass: "bg-amber-100", textClass: "text-amber-700" },
  HIGH: { label: "High", bgClass: "bg-orange-100", textClass: "text-orange-700" },
  URGENT: { label: "Urgent", bgClass: "bg-red-100", textClass: "text-red-700" },
};

const categoryLabels: Record<string, string> = {
  ROAD: "Roads & Infrastructure",
  LIGHTING: "Street Lighting",
  WASTE: "Waste Management",
  WATER: "Water Supply",
  GREEN_SPACE: "Green Spaces",
  BUILDING: "Buildings",
  NOISE: "Noise Pollution",
  OTHER: "Other",
};

export default function TechnicianTasksPage() {
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();

  const [tasks, setTasks] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    overdue: 0,
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Complaint | null>(null);
  const [resolveModal, setResolveModal] = useState(false);
  const [taskDetailModal, setTaskDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [resolveNote, setResolveNote] = useState("");
  const [proofPhotos, setProofPhotos] = useState<File[]>([]);

  useEffect(() => {
    if (hydrated && user && user.role !== "TECHNICIAN") {
      router.push("/dashboard");
    }
  }, [hydrated, user, router]);

  const fetchTasks = useCallback(async () => {
    if (!token || !user) return;
    try {
      setLoading(true);
      const response = await technicianService.getTechnicianTasks({
        status: filter === "ALL" ? undefined : filter,
      });
      setTasks(response.data?.complaints || response.data?.tasks || []);

      const statsResp = await technicianService.getTechnicianStats();
      if (statsResp.data) {
        setStats({
          total: statsResp.data.total || 0,
          assigned: statsResp.data.assigned || 0,
          inProgress: statsResp.data.inProgress || 0,
          resolved: statsResp.data.resolved || 0,
          overdue: 0,
        });
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [token, user, filter]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const [countResult, notifResult] = await Promise.all([
        notificationService.getNotificationCount(),
        notificationService.getNotifications(),
      ]);
      if (countResult.success && typeof countResult.count === "number") {
        setUnreadCount(countResult.count);
      }
      if (notifResult.success && notifResult.data) {
        setNotifications(notifResult.data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, [token]);

  useEffect(() => {
    if (hydrated && token) {
      fetchTasks();
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [hydrated, token, fetchTasks, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markNotificationAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    if (notification.relatedId) {
      router.push(`/dashboard/complaints/${notification.relatedId}?from=tasks`);
    }
    setShowNotifications(false);
  };

  const handleStartWork = async (id: string) => {
    setActionLoading(true);
    try {
      const result = await technicianService.startWork(id);
      if (result.success) {
        showToast("Work started successfully!", "success");
        fetchTasks();
      } else {
        showToast(result.message || "Failed to start work.", "error");
      }
    } catch (err: unknown) {
      console.error("Error starting work:", err);
      const error = err as { message?: string; data?: { message?: string } };
      const errorMsg = error?.message || error?.data?.message || "Failed to start work. Make sure the task is assigned to you.";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTask || !resolveNote.trim()) return;
    setActionLoading(true);
    try {
      let photoUrls: string[] = [];
      if (proofPhotos.length > 0) {
        const formData = new FormData();
        proofPhotos.forEach((file) => formData.append("media", file));
        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/upload`,
          { method: "POST", body: formData, credentials: "include" }
        );
        const uploadData = await uploadRes.json() as { success?: boolean; data?: Array<{ url?: string }> };
        if (uploadData.success && uploadData.data) {
          photoUrls = uploadData.data.map((f) => f.url || "");
        }
      }
      await technicianService.resolveTask(selectedTask._id || "", resolveNote, photoUrls);
      showToast("Task resolved successfully!", "success");
      setResolveModal(false);
      setResolveNote("");
      setProofPhotos([]);
      fetchTasks();
    } catch (err) {
      console.error("Error resolving task:", err);
      showToast("Failed to resolve task.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const openTaskDetail = (task: Complaint) => {
    setSelectedTask(task);
    setTaskDetailModal(true);
  };

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    const q = searchTerm.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.location?.address?.toLowerCase().includes(q)
    );
  }, [tasks, searchTerm]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "TECHNICIAN") return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="My Tasks"
        subtitle="Manage your assigned work orders"
        backHref="/dashboard"
        variant="hero"
        rightContent={
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all border border-white/20 shadow-lg"
              >
                <Bell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg animate-dot-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-scaleIn">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-900">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <button
                          key={n._id}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                        >
                          <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Assigned</p>
                <p className="text-3xl font-bold text-primary mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp delay-75">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">In Progress</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp delay-150">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Resolved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.resolved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200 animate-fadeInUp delay-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Overdue</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.overdue}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-200 animate-fadeIn">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              {["ALL", "ASSIGNED", "IN_PROGRESS", "RESOLVED"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filter === f
                      ? "bg-primary text-white shadow-lg"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f === "ALL" ? "All" : f === "ASSIGNED" ? "Assigned" : f === "IN_PROGRESS" ? "In Progress" : "Resolved"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-slate-600">Loading tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200 animate-fadeIn">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {searchTerm ? "No results found" : "No tasks assigned"}
            </h3>
            <p className="text-slate-500">
              {searchTerm ? "Try adjusting your search" : "You have no pending tasks at the moment"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map((task, index) => {
              const status = statusConfig[task.status] || statusConfig.ASSIGNED;
              const urgency = task.urgency ? urgencyConfig[task.urgency] : null;
              const id = task._id || "";

              return (
                <div
                  key={id}
                  className={`bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border ${status.borderClass} hover:border-primary/30 animate-fadeInUp`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                            #{task.referenceId || id.slice(-6)}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bgClass} ${status.textClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.textClass.replace('text-', 'bg-')} animate-pulse-soft`} />
                            {status.label}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {categoryLabels[task.category] || task.category}
                          </span>
                          {urgency && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${urgency.bgClass} ${urgency.textClass}`}>
                              {urgency.label}
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 text-lg">
                          {task.title || task.description?.slice(0, 80)}
                        </h3>

                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                          {task.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {task.location?.address && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="truncate">{task.location.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>{new Date(task.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>
                          </div>
                          {task.municipalityName && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                              <Building className="w-4 h-4 text-primary flex-shrink-0" />
                              <span>{task.municipalityName}</span>
                            </div>
                          )}
                          {task.media && task.media.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                              <Camera className="w-4 h-4 text-primary flex-shrink-0" />
                              <span>{task.media.length} photo(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      {task.status === "ASSIGNED" && (
                        <>
                          <button
                            onClick={() => handleStartWork(id)}
                            disabled={actionLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
                          >
                            <Play className="w-4 h-4" />
                            Start Work
                          </button>
                          <button onClick={() => openTaskDetail(task)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium">
                            <Eye className="w-4 h-4" />
                            Details
                          </button>
                        </>
                      )}
                      {task.status === "IN_PROGRESS" && (
                        <>
                          <button
                            onClick={() => { setSelectedTask(task); setResolveModal(true); }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all text-sm font-semibold shadow-lg hover:shadow-xl"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark Resolved
                          </button>
                          <button onClick={() => openTaskDetail(task)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium">
                            <Eye className="w-4 h-4" />
                            Details
                          </button>
                        </>
                      )}
                      {(task.status === "RESOLVED" || task.status === "CLOSED") && (
                        <button onClick={() => openTaskDetail(task)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium">
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      <Modal
        isOpen={resolveModal}
        onClose={() => { setResolveModal(false); setResolveNote(""); setProofPhotos([]); }}
        title="Mark as Resolved"
        description="Add resolution notes and proof photos to complete this task"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolveModal(false)} disabled={actionLoading}>Cancel</Button>
            <Button onClick={handleResolve} isLoading={actionLoading} disabled={!resolveNote.trim() || resolveNote.trim().length < 20}>
              Confirm Resolution
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Resolution Report <span className="text-red-500">*</span>
            </label>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
              rows={5}
              placeholder="Describe the work done to resolve this issue..."
            />
            <p className="text-xs text-slate-500 mt-1">{resolveNote.length}/20 characters minimum</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Proof Photos (recommended)</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
              <input type="file" multiple accept="image/*" className="hidden" id="proof-photos" onChange={(e) => { const files = Array.from(e.target.files || []); setProofPhotos(files); }} />
              <label htmlFor="proof-photos" className="cursor-pointer">
                <Camera className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Click to upload proof photos</p>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        isOpen={taskDetailModal}
        onClose={() => setTaskDetailModal(false)}
        title="Task Details"
        description={selectedTask ? `#${selectedTask.referenceId || (selectedTask._id || "").slice(-6)}` : ""}
        size="xl"
        footer={<Button variant="ghost" onClick={() => setTaskDetailModal(false)}>Close</Button>}
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* Status and Priority Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${statusConfig[selectedTask.status]?.bgClass || "bg-slate-100"} ${statusConfig[selectedTask.status]?.textClass || "text-slate-700"}`}>
                {statusConfig[selectedTask.status]?.label || selectedTask.status}
              </span>
              {selectedTask.urgency && (
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${urgencyConfig[selectedTask.urgency]?.bgClass || "bg-slate-100"} ${urgencyConfig[selectedTask.urgency]?.textClass || "text-slate-700"}`}>
                  {urgencyConfig[selectedTask.urgency]?.label || selectedTask.urgency}
                </span>
              )}
              {selectedTask.category && (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-primary/10 text-primary shadow-sm">
                  {categoryLabels[selectedTask.category] || selectedTask.category}
                </span>
              )}
            </div>

            {/* Title and Description */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl p-6 border border-slate-200">
              <h4 className="text-xl font-bold text-slate-900 mb-3">{selectedTask.title || "No title"}</h4>
              <p className="text-slate-600 leading-relaxed">{selectedTask.description}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Submitted</p>
                <p className="text-sm font-bold text-blue-900">{new Date(selectedTask.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              {selectedTask.updatedAt && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Last Updated</p>
                  <p className="text-sm font-bold text-purple-900">{new Date(selectedTask.updatedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
              )}
            </div>

            {/* Location */}
            {selectedTask.location && (
              <div className="space-y-3">
                <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Location
                </h5>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-sm font-medium text-slate-700">{selectedTask.location.address || "No address provided"}</p>
                  {selectedTask.location.commune && (
                    <p className="text-xs text-slate-500 mt-1">{selectedTask.location.commune}</p>
                  )}
                </div>
                {selectedTask.location.coordinates && selectedTask.location.coordinates.length >= 2 && (
                  <div className="space-y-2">
                    <iframe
                      title="Location Map"
                      width="100%"
                      height="200"
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedTask.location.coordinates[1] - 0.005}%2C${selectedTask.location.coordinates[0] - 0.005}%2C${selectedTask.location.coordinates[1] + 0.005}%2C${selectedTask.location.coordinates[0] + 0.005}&layer=mapnik&marker=${selectedTask.location.coordinates[0]}%2C${selectedTask.location.coordinates[1]}`}
                      className="rounded-xl border-2 border-slate-200 w-full"
                    />
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedTask.location.coordinates[0]},${selectedTask.location.coordinates[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-bold shadow-lg"
                    >
                      <MapPin className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Media */}
            {selectedTask.media && selectedTask.media.length > 0 && (
              <div>
                <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-primary" />
                  Photos ({selectedTask.media.length})
                </h5>
                <div className="grid grid-cols-3 gap-2">
                  {selectedTask.media.slice(0, 6).map((m, i) => (
                    <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-primary/30 transition-all">
                      <img src={m.url} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
