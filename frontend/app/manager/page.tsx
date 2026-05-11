'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Wrench,
  Flag,
  Clock,
  AlertTriangle,
  Filter,
  Download,
  Search,
  CheckCircle,
  MapPin,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { managerService } from '@/services/manager.service';
import { categoryLabels } from '@/lib/complaints';
import { getCategoryLabel } from '@/lib/categories';
import { showToast } from '@/components/ui/Toast';
import {
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
  Modal,
  Button,
} from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AISpikeAlertCard from '@/components/dashboard/AISpikeAlertCard';
import TrendForecastChart from '@/components/dashboard/TrendForecastChart';
import dynamic from 'next/dynamic';

const ManagerComplaintMap = dynamic(
  () => import('@/components/dashboard/ManagerComplaintMap'),
  { ssr: false }
);

type ComplaintMapPoint = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priorityScore?: number;
  urgency?: string;
  referenceId?: string;
  createdAt: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  municipalityName?: string;
};
import type { BaseComplaint } from '@/components/ui';

interface ManagerComplaint extends BaseComplaint {
  assignedTeam?: {
    _id?: string;
    name?: string;
    members?: Array<{
      _id?: string;
      fullName: string;
    }>;
  } | null;

  _id: string;
  title?: string;
  updatedAt?: string;
  createdBy?: { fullName: string };
}

export default function ManagerDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [complaints, setComplaints] = useState<ManagerComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [technicians, setTechnicians] = useState<
    Array<{ _id: string; fullName: string }>
  >([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [assignTechTarget, setAssignTechTarget] = useState<string | null>(null);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);

  const [priorityTarget, setPriorityTarget] = useState<string | null>(null);
  const [priorityScore, setPriorityScore] = useState<number>(5);

  const [refreshing, setRefreshing] = useState(false);

  const [mapData, setMapData] = useState<ComplaintMapPoint[]>([]);
  const [mapLoading, setMapLoading] = useState(true);

  // Update available municipalities when governorate changes
  useEffect(() => {
    if (!token) router.push('/');
  }, [token, router]);

  const refreshComplaints = async () => {
    setRefreshing(true);
    try {
      const response = await managerService.getManagerComplaints({
        status: statusFilter || undefined,
      });
      if (response.data?.complaints) {
        setComplaints(response.data.complaints);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      if (!token || !user || user.role !== 'DEPARTMENT_MANAGER') return;
      try {
        setLoading(true);
        const response = await managerService.getManagerComplaints({
          page: 1,
          limit: 100,
          status: statusFilter || undefined,
        });
        if (response.data?.complaints) {
          setComplaints(response.data.complaints);
        }
      } catch (err) {
        console.error('Error fetching complaints:', err);
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token, user, statusFilter]);

  useEffect(() => {
    const fetchMapData = async () => {
      if (!token || !user || user.role !== 'DEPARTMENT_MANAGER') return;
      try {
        setMapLoading(true);
        const response = await managerService.getManagerComplaintsGeo();
        if (response.data && Array.isArray(response.data)) {
          setMapData(response.data);
        }
      } catch (err) {
        console.error('Error fetching map data:', err);
        setMapData([]);
      } finally {
        setMapLoading(false);
      }
    };
    fetchMapData();
  }, [token, user]);

  useEffect(() => {
    const fetchTechs = async () => {
      if (!token || !user || user.role !== 'DEPARTMENT_MANAGER') return;
      try {
        const response = await managerService.getTechnicians();
        if (response.data) setTechnicians(response.data);
      } catch (err) {
        console.error('Error fetching technicians:', err);
      }
    };
    fetchTechs();
  }, [token, user]);

  const handleAssignTechnician = async () => {
    if (!assignTechTarget || selectedTechnicians.length === 0) return;
    setActionLoading(assignTechTarget);
    try {
      let result;
      if (selectedTechnicians.length === 1) {
        result = await managerService.assignTechnician(
          assignTechTarget,
          selectedTechnicians[0]
        );
      } else {
        result = await managerService.assignTeam(
          assignTechTarget,
          selectedTechnicians
        );
      }
      if (result.success) {
        showToast('Technician(s) assigned successfully!', 'success');
        setAssignTechTarget(null);
        setSelectedTechnicians([]);
        await refreshComplaints();
      } else {
        showToast(
          (result as { message?: string }).message ||
            'Failed to assign technician(s)',
          'error'
        );
      }
    } catch (err: unknown) {
      console.error('Error assigning technician(s):', err);
      const errorObj = err as { message?: string };
      showToast(errorObj?.message || 'Failed to assign technician(s)', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter complaints based on all filters
  const filteredComplaints = complaints.filter((c) => {
    if (priorityFilter) {
      const score = c.priorityScore || 0;
      if (priorityFilter === 'HIGH' && score < 15) return false;
      if (priorityFilter === 'MEDIUM' && (score < 6 || score >= 15))
        return false;
      if (priorityFilter === 'LOW' && score >= 6) return false;
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      c.location?.address?.toLowerCase().includes(q)
    );
  });

  // Calculate statistics - ONLY count based on SLA deadline passed
  const overdueCount = complaints.filter((c) => {
    if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) return false;
    if (c.slaDeadline) {
      const deadlineDate = new Date(c.slaDeadline);
      return deadlineDate.getTime() < Date.now();
    }
    return false;
  }).length;

  const resolvedCount = complaints.filter(
    (c) => c.status === 'RESOLVED'
  ).length;
  const inProgressCount = complaints.filter(
    (c) => c.status === 'IN_PROGRESS'
  ).length;
  const totalCount = complaints.length;

  // Export functions
  const exportCSV = () => {
    const headers = [
      'Reference',
      'Title',
      'Category',
      'Status',
      'Priority',
      'Municipality',
      'Created',
    ];
    const rows = filteredComplaints.map((c) => [
      c._id || c.id || '',
      c.title?.replace(/,/g, ' '),
      getCategoryLabel(c.category),
      c.status,
      (c.priorityScore || 0).toString(),
      c.municipalityName || '',
      new Date(c.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manager_complaints_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!user || user.role !== 'DEPARTMENT_MANAGER') return null;

  const municipality =
    user?.municipalityName ||
    (typeof user?.municipality === 'object' ? user?.municipality?.name : '') ||
    '';

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/50">
        {/* Header Row */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Welcome back, {user?.fullName?.split(' ')[0] || 'Manager'}
                </h1>
                <p className="text-slate-500 mt-1">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Quick Stats - 4 cards in a row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">
                      {totalCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">In Progress</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">
                      {inProgressCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Overdue</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">
                      {overdueCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Resolved This Week</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">
                      {resolvedCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Complaints Overview Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Complaints Overview
            </h2>

            {/* SLA Overdue Banner */}
            {overdueCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">
                    {overdueCount} complaint{overdueCount > 1 ? 's' : ''}{' '}
                    overdue
                  </p>
                  <p className="text-sm text-red-600">
                    SLA deadline has passed for {overdueCount} complaint
                    {overdueCount > 1 ? 's' : ''}. Take immediate action.
                  </p>
                </div>
              </div>
            )}

            {/* Filters Section */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border border-slate-200">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showFilters
                    ? t('common.hideFilters')
                    : t('common.showFilters')}
                </Button>

                <div className="flex gap-2 ml-auto">
                  <Button
                    onClick={exportCSV}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex flex-col md:flex-row gap-3 items-center">
                    <div className="flex-1 w-full relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by description or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="">All Statuses</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>

                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="">{t('manager.priorityFilterAll')}</option>
                      <option value="HIGH">
                        {t('manager.priorityFilterHigh')}
                      </option>
                      <option value="MEDIUM">
                        {t('manager.priorityFilterMedium')}
                      </option>
                      <option value="LOW">
                        {t('manager.priorityFilterLow')}
                      </option>
                    </select>

                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {filteredComplaints.length} results
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Complaints List */}
            {loading && <LoadingSpinner />}

            {!loading &&
              (filteredComplaints.length === 0 ? (
                <EmptyState
                  icon="file"
                  message={
                    searchTerm || statusFilter || priorityFilter
                      ? t('common.tryAdjustingFilters')
                      : t('manager.noPendingComplaints')
                  }
                />
              ) : (
                <div className="grid gap-5">
                  {filteredComplaints.map((complaint, index) => {
                    const id = complaint._id || complaint.id || '';

                    return (
                      <ComplaintCard
                        key={id}
                        complaint={complaint}
                        showCitizen
                        showDepartment
                        showAssignedTo
                        showPriority
                        index={index}
                        actions={
                          <>
                            {!(
                              complaint.assignedTo || complaint.assignedTeam
                            ) &&
                              (complaint.status === 'VALIDATED' ||
                                complaint.status === 'ASSIGNED') && (
                                <button
                                  onClick={() => {
                                    setAssignTechTarget(id);
                                    setSelectedTechnicians([]);
                                  }}
                                  disabled={actionLoading === id}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-primary/25"
                                >
                                  <Wrench className="w-4 h-4" />
                                  {t('manager.assignRepairTeam')}
                                </button>
                              )}
                            {!(
                              complaint.assignedTo || complaint.assignedTeam
                            ) &&
                              complaint.status === 'VALIDATED' &&
                              !complaint.assignedDepartment && (
                                <button
                                  onClick={() => {
                                    setPriorityTarget(id);
                                    setPriorityScore(
                                      complaint.priorityScore ?? 5
                                    );
                                  }}
                                  disabled={actionLoading === id}
                                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all text-sm font-medium disabled:opacity-50 hover:shadow-lg"
                                >
                                  <Flag className="w-4 h-4" />
                                  Set Priority
                                </button>
                              )}
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
              ))}
          </div>

          {/* Performance Row - Team performance + Resolution time trend */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Performance
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  Team Performance
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">
                      {inProgressCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Active</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">
                      {resolvedCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Completed</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  Resolution Time Trend
                </h3>
                <div className="h-32 flex items-end gap-2">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-primary to-primary-500 rounded-t"
                      style={{ height: `${30 + Math.random() * 50}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights Row - Widget A and Widget B side by side */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              AI Insights
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AISpikeAlertCard municipality={municipality} />
            </div>
          </div>

          {/* AI Trend Forecasts - Full Width */}
          <div className="mb-6">
            <TrendForecastChart municipality={municipality} category="" />
          </div>

          {/* Map Section - Embedded complaint map */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Complaint Map
            </h2>
            <ManagerComplaintMap
              data={mapData}
              municipality={user?.municipalityName || undefined}
              height="450px"
            />
          </div>
        </main>

        {/* Assign Technician Modal */}
        <Modal
          isOpen={assignTechTarget !== null}
          onClose={() => {
            setAssignTechTarget(null);
            setSelectedTechnicians([]);
          }}
          title="Assign Repair Team"
          description="Select one or more technicians to form a repair team for this complaint."
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setAssignTechTarget(null);
                  setSelectedTechnicians([]);
                }}
                disabled={actionLoading !== null}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignTechnician}
                isLoading={actionLoading !== null}
                disabled={
                  selectedTechnicians.length === 0 || actionLoading !== null
                }
              >
                {selectedTechnicians.length > 1
                  ? `Assign Team (${selectedTechnicians.length})`
                  : 'Assign'}
              </Button>
            </>
          }
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {technicians.map((tech) => {
              const activeCount = complaints.filter(
                (c) =>
                  c.assignedTo?._id === tech._id &&
                  ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)
              ).length;
              const selected = selectedTechnicians.includes(tech._id);
              return (
                <label
                  key={tech._id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      setSelectedTechnicians((prev) =>
                        selected
                          ? prev.filter((id) => id !== tech._id)
                          : [...prev, tech._id]
                      )
                    }
                    className="w-4 h-4 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {tech.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {activeCount > 0
                        ? `${activeCount} active task${activeCount > 1 ? 's' : ''}`
                        : 'Available'}
                    </p>
                  </div>
                  {activeCount === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                      Free
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </Modal>

        {/* Priority Modal */}
        <Modal
          isOpen={priorityTarget !== null}
          onClose={() => setPriorityTarget(null)}
          title={t('manager.updatePriority')}
          description="Click pill matching list view colors."
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setPriorityTarget(null)}
                disabled={actionLoading !== null}
              >
                Cancel
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                {
                  level: 'LOW',
                  color:
                    'bg-green-500 hover:bg-green-600 text-white border-2 border-green-400',
                  score: 3,
                },
                {
                  level: 'MEDIUM',
                  color:
                    'bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-400',
                  score: 6,
                },
                {
                  level: 'HIGH',
                  color:
                    'bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-400',
                  score: 8,
                },
                {
                  level: 'CRITICAL',
                  color:
                    'bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 shadow-md shadow-red-200',
                  score: 10,
                },
              ].map(({ level, color, score }) => (
                <Button
                  key={level}
                  className={`p-3 rounded-xl font-semibold transition-all ${color} shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-100`}
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setActionLoading(priorityTarget);
                    try {
                      await managerService.updatePriority(priorityTarget!, {
                        urgency: level as string,
                        priorityScore: score,
                      });
                      await refreshComplaints();
                      alert('Priority updated successfully');
                    } catch (err) {
                      alert('Priority update failed');
                    } finally {
                      setActionLoading(null);
                      setPriorityTarget(null);
                    }
                  }}
                  disabled={actionLoading === priorityTarget}
                >
                  <Flag className="w-4 h-4 mr-1" />
                  {level}
                  <div className="text-xs mt-1 opacity-90">Score: {score}</div>
                </Button>
              ))}
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
