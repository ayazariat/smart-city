"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Building2,
  ArrowLeft,
  Calendar,
  Loader2,
  Play,
  CheckCircle,
  X,
  Camera,
  ExternalLink,
  User,
  FileText,
  Wrench,
  Bell,
  Phone,
  History,
  Star,
  Shield,
  Mail,
  UserCog
} from "lucide-react";
import { Complaint } from "@/types";
import { technicianService } from "@/services/technician.service";
import { notificationService } from "@/services/notification.service";
import { useAuthStore } from "@/store/useAuthStore";
import { Button, PageHeader } from "@/components/ui";
import { showToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui";
import Timeline from "@/components/complaints/Timeline";
import { categoryLabels } from "@/lib/complaints";
import { getPhotoUrl } from "@/lib/photos";

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  ASSIGNED: { label: "ASSIGNED", bgClass: "bg-purple-100", textClass: "text-purple-800" },
  IN_PROGRESS: { label: "IN PROGRESS", bgClass: "bg-orange-100", textClass: "text-orange-800" },
  RESOLVED: { label: "RESOLVED", bgClass: "bg-green-100", textClass: "text-green-800" },
  CLOSED: { label: "CLOSED", bgClass: "bg-gray-100", textClass: "text-gray-800" },
};

const urgencyLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export default function TechnicianTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();
  const taskId = params.id as string;

  const [task, setTask] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [resolveModal, setResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [proofPhotos, setProofPhotos] = useState<File[]>([]);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleBack = () => {
    router.push("/tasks");
  };

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
    } catch {
      // Silently fail
    }
  }, [token]);

  const fetchTaskDetail = useCallback(async () => {
    if (!token || !taskId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await technicianService.getTaskDetail(taskId);
      if (response.success && response.data) {
        setTask(response.data);
      } else {
        setError("Task not found");
      }
    } catch (err: any) {
      console.error("Error fetching task:", err);
      setError(err?.message || "Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [token, taskId]);

  useEffect(() => {
    if (hydrated && token) {
      fetchTaskDetail();
      fetchNotifications();
    }
  }, [hydrated, token, fetchTaskDetail, fetchNotifications]);

  useEffect(() => {
    if (hydrated && user && user.role !== "TECHNICIAN") {
      router.push("/dashboard");
    }
  }, [hydrated, user, router]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markNotificationAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    if (notification.relatedId) {
      router.push(`/tasks/${notification.relatedId}`);
    }
    setShowNotifications(false);
  };

  const handleStartWork = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      await technicianService.startWork(task._id || "");
      showToast("Work started successfully!", "success");
      fetchTaskDetail();
    } catch (err: any) {
      showToast(err?.message || "Failed to start work", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!task || !resolveNote.trim()) return;
    setActionLoading(true);
    try {
      let photoUrls: string[] = [];
      if (proofPhotos.length > 0) {
        const formData = new FormData();
        proofPhotos.forEach((file) => formData.append("media", file));
        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/upload`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          }
        );
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.data) {
          photoUrls = uploadData.data.map((f: any) => f.url);
        }
      }

      await technicianService.resolveTask(task._id || "", resolveNote, photoUrls);
      showToast("Task resolved successfully!", "success");
      setResolveModal(false);
      setResolveNote("");
      setProofPhotos([]);
      fetchTaskDetail();
    } catch (err: any) {
      showToast(err?.message || "Failed to resolve task", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const getComplaintIdDisplay = (id: string) => {
    return `RC-${id.slice(-6)}`;
  };

  const getUrgencyValue = (urgency: string | number): number => {
    if (typeof urgency === "number") return urgency;
    const urgencyMap: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 4,
      URGENT: 5,
    };
    return urgencyMap[urgency] || 3;
  };

  const hasLocation = task && (
    (task.location?.latitude && task.location?.longitude) ||
    (task.location?.coordinates && task.location.coordinates[0] !== 0 && task.location.coordinates[1] !== 0)
  );

  const hasValidPhotos = task?.media && task.media.filter(m => getPhotoUrl(m.url)).length > 0;

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "TECHNICIAN") {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <PageHeader title="Task Details" showBackButton backHref="/tasks" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
        <PageHeader title="Error" showBackButton backHref="/tasks" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md mx-4 p-6 bg-white rounded-2xl shadow-lg">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error || "Task not found"}
            </div>
            <Button variant="primary" onClick={() => router.push("/tasks")}>
              Back to Tasks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = statusConfig[task.status] || {
    label: task.status,
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      <PageHeader
        title={`Task ${getComplaintIdDisplay(task._id || task.id || "")}`}
        onBackClick={handleBack}
        rightContent={
          <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${status.bgClass} ${status.textClass}`}>
            {status.label}
          </span>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-2">
          {task.status === "ASSIGNED" && (
            <Button
              variant="primary"
              onClick={handleStartWork}
              isLoading={actionLoading}
              icon={<Play className="w-4 h-4" />}
            >
              Start Work
            </Button>
          )}
          {task.status === "IN_PROGRESS" && (
            <Button
              variant="primary"
              onClick={() => setResolveModal(true)}
              icon={<CheckCircle className="w-4 h-4" />}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              Mark Resolved
            </Button>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Main Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-500 mb-2">Category</label>
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                    {categoryLabels[task.category] || task.category}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-500 mb-2">Urgency</label>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-8 h-2 rounded-sm transition-all ${
                            level <= getUrgencyValue(task.urgency)
                              ? "bg-gradient-to-r from-orange-400 to-red-500 shadow-sm"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xl font-bold text-orange-600">
                      {getUrgencyValue(task.urgency)}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({urgencyLabels[task.urgency as string] || "Medium"})
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-r from-primary/5 to-secondary/50 rounded-2xl shadow-lg p-6 border border-primary/10">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Status Timeline
              </h2>
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 rounded-full -translate-y-1/2"></div>
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-green-400 to-primary rounded-full -translate-y-1/2 transition-all duration-500"
                  style={{ width: task.status === 'RESOLVED' || task.status === 'CLOSED' ? '100%' : task.status === 'IN_PROGRESS' ? '66%' : task.status === 'ASSIGNED' ? '33%' : '0%' }}
                ></div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${task.status !== 'ASSIGNED' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">Assigned</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${task.status === 'IN_PROGRESS' || task.status === 'RESOLVED' || task.status === 'CLOSED' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">In Progress</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${task.status === 'RESOLVED' || task.status === 'CLOSED' ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">Resolved</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${task.status === 'CLOSED' ? 'bg-gray-600 text-white' : 'bg-slate-200 text-slate-400'} transition-all duration-300`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs mt-1 font-medium text-slate-600">Closed</span>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-800 whitespace-pre-wrap">{task.description}</p>
            </section>

            {task.phone && (
              <section className="bg-green-50 rounded-xl shadow-sm p-6 border border-green-200">
                <h2 className="text-sm font-medium text-green-800 mb-2">Contact Phone</h2>
                <p className="text-green-700 font-bold text-lg">{task.phone}</p>
              </section>
            )}

            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
              {!hasLocation ? (
                <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200 border-dashed">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-600 font-medium">Location not available</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-64 rounded-lg overflow-hidden">
                    {(() => {
                      const lat = task.location?.latitude || (task.location?.coordinates?.[1]);
                      const lng = task.location?.longitude || (task.location?.coordinates?.[0]);
                      if (lat && lng) {
                        return (
                          <iframe
                            title="Task Location"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.005}%2C${lng + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`}
                          />
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {task.location?.address && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${task.location.latitude || task.location?.coordinates?.[1]},${task.location.longitude || task.location?.coordinates?.[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:text-primary-700 font-medium mt-2"
                    >
                      <MapPin className="w-5 h-5" />
                      {task.location.address}
                      <span className="text-xs bg-primary/10 px-2 py-1 rounded">Open in Maps</span>
                    </a>
                  )}
                </>
              )}
            </section>

            {hasValidPhotos && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos ({task.media?.filter(m => getPhotoUrl(m.url)).length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {task.media?.filter(m => getPhotoUrl(m.url)).map((item, index) => (
                    <a key={index} href={getPhotoUrl(item.url) || '#'} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={getPhotoUrl(item.url) || ''}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {task.history && task.history.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
                <Timeline history={task.history} />
              </section>
            )}
          </div>

          <aside className="space-y-6">
            {task.createdBy && (
              <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Citizen
                </h2>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {typeof task.createdBy === 'object' ? task.createdBy.fullName : 'Citizen'}
                  </p>
                  {typeof task.createdBy === 'object' && task.createdBy.email && (
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {task.createdBy.email}
                    </p>
                  )}
                  {typeof task.createdBy === 'object' && task.createdBy.phone && (
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {task.createdBy.phone}
                    </p>
                  )}
                </div>
              </section>
            )}

            {task.assignedDepartment && (
              <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Department
                </h2>
                <p className="font-semibold text-slate-900">
                  {typeof task.assignedDepartment === 'object' ? task.assignedDepartment.name : task.assignedDepartment}
                </p>
              </section>
            )}

            <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Dates
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <dt className="text-slate-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Created:
                  </dt>
                  <dd className="text-slate-900 font-medium">
                    {new Date(task.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                {task.startedAt && (
                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                    <dt className="text-orange-600 flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Started:
                    </dt>
                    <dd className="text-orange-700 font-medium">
                      {new Date(task.startedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </dd>
                  </div>
                )}
                {task.resolvedAt && (
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                    <dt className="text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Resolved:
                    </dt>
                    <dd className="text-green-700 font-medium">
                      {new Date(task.resolvedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {task.priorityScore !== undefined && (
              <section className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Priority Score
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-primary">{task.priorityScore}</span>
                  <span className="text-sm text-slate-500">/ 10</span>
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      <Modal
        isOpen={resolveModal}
        onClose={() => {
          setResolveModal(false);
          setResolveNote("");
          setProofPhotos([]);
        }}
        title="Mark as Resolved"
        description="Add resolution notes and proof photos to complete this task"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolveModal(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleResolve}
              isLoading={actionLoading}
              disabled={!resolveNote.trim() || resolveNote.trim().length < 10}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
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
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={5}
              placeholder="Describe the work done..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Proof Photos</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-primary/40 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="proof-photos-input"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setProofPhotos(files);
                }}
              />
              <div 
                className="cursor-pointer flex flex-col items-center"
                onClick={() => document.getElementById('proof-photos-input')?.click()}
              >
                <Camera className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Click to upload photos</p>
              </div>
            </div>
            {proofPhotos.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {proofPhotos.map((file, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="proof"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      onClick={() => setProofPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
