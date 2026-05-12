'use client';

// @ts-nocheck - Temporarily disable TypeScript checking for this file
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  CheckCircle,
  XCircle,
  Building,
  TrendingUp,
  Clock,
  AlertTriangle,
  Filter,
  Download,
  Search,
  CheckCircle2,
  X,
  Copy,
  Merge,
  MapPin,
} from 'lucide-react';
import { getPhotoUrl } from '@/lib/photos';
import { useAuthStore } from '@/store/useAuthStore';
import { agentService } from '@/services/agent.service';
import { Complaint } from '@/types';
import { getCategoryLabel, getDepartmentLabel } from '@/lib/categories';
import { useTranslation } from 'react-i18next';
import { categoryOptions, categoryLabels } from '@/lib/categories';
import { STATUS_OPTIONS } from '@/lib/complaints';
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  ComplaintCard,
  Modal,
  Button,
  ConfirmationModal,
} from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AgentComplaintsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, token, hydrated } = useAuthStore();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [municipalityName, setMunicipalityName] = useState<string>('');
  const [departments, setDepartments] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<{
    departmentId?: string;
    departmentName?: string;
    confidence?: number;
  } | null>(null);

  // NOTE: Resolution approval/rejection moved to Manager/Admin dashboard per Task 10
  // Agents no longer have resolution review capabilities

  // Confirmation modal states
  const [confirmAction, setConfirmAction] = useState<{
    type: 'validate' | 'reject' | 'assign' | null;
    targetId: string | null;
    targetName: string;
  }>({ type: null, targetId: null, targetName: '' });

  // Duplicate handling states (BL-25)
  const [duplicateTarget, setDuplicateTarget] = useState<string | null>(null);
  const [duplicateComplaints, setDuplicateComplaints] = useState<Complaint[]>(
    []
  );
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeSourceIds, setMergeSourceIds] = useState<string[]>([]);

  const refreshComplaints = async () => {
    const response = await agentService.getAgentComplaints({
      status: 'ALL',
      limit: 200,
    });
    if (response.data) {
      setComplaints(response.data.complaints);
      if (response.data.municipalityName) {
        setMunicipalityName(response.data.municipalityName);
      }
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.push('/');
  }, [hydrated, token, router]);

  useEffect(() => {
    const fetch = async () => {
      if (!hydrated || !token || !user || user.role !== 'MUNICIPAL_AGENT')
        return;
      try {
        setLoading(true);
        const response = await agentService.getAgentComplaints({
          page: 1,
          limit: 200,
          status: 'ALL',
        });
        if (response.data?.complaints) {
          setComplaints(response.data.complaints);
          if (response.data.municipalityName) {
            setMunicipalityName(response.data.municipalityName);
          }
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        if (error.message?.includes('Municipality not configured')) {
          alert(
            "Your account doesn't have a municipality configured. Please contact an administrator."
          );
        }
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [hydrated, token, user, statusFilter]);

  // Automatically check for similar complaints when complaints are loaded
  useEffect(() => {
    if (complaints.length > 0) {
      complaints.forEach(complaint => {
        if (complaint.status === 'SUBMITTED' && !complaint.assignedDepartment) {
          checkForSimilarComplaints(complaint);
        }
      });
    }
  }, [complaints]);

  useEffect(() => {
    const fetchDepts = async () => {
      if (!hydrated || !token || !user || user.role !== 'MUNICIPAL_AGENT')
        return;
      try {
        const response = await agentService.getAgentDepartments();
        if (response.data && Array.isArray(response.data)) {
          setDepartments(response.data);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepts();
  }, [hydrated, token, user]);

  const handleValidate = async (complaintId: string) => {
    setConfirmAction({ type: null, targetId: null, targetName: '' });
    setActionLoading(complaintId);
    try {
      await agentService.validateComplaint(complaintId);
      await refreshComplaints();
    } catch (err) {
      console.error('Error validating:', err);
      alert('Failed to validate complaint');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmValidate = () => {
    if (confirmAction.targetId) {
      handleValidate(confirmAction.targetId);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason) return;
    setActionLoading(rejectTarget);
    try {
      await agentService.rejectComplaint(rejectTarget, rejectReason);
      setRejectTarget(null);
      setRejectReason('');
      await refreshComplaints();
    } catch (err) {
      console.error('Error rejecting:', err);
      alert('Failed to reject complaint');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async () => {
    if (!assignTarget || !selectedDepartment) return;
    setActionLoading(assignTarget);
    try {
      const result = await agentService.assignComplaintToDepartment(
        assignTarget,
        selectedDepartment
      );
      if (result.success) {
        setAssignTarget(null);
        setSelectedDepartment('');
        setAiSuggestion(null);
        await refreshComplaints();
      } else {
        alert(
          (result as { message?: string }).message ||
            'Failed to assign complaint'
        );
      }
    } catch (err: unknown) {
      console.error('Error assigning:', err);
      const errorObj = err as { message?: string };
      alert(errorObj?.message || 'Failed to assign complaint');
    } finally {
      setActionLoading(null);
    }
  };

  // AI duplicate check result with similarity scores
  const [duplicateMatchScores, setDuplicateMatchScores] = useState<
    Record<string, number>
  >({});

  // Track which complaints have similar complaints detected
  const [similarComplaintsDetected, setSimilarComplaintsDetected] = useState<
    Record<string, boolean>
  >({});

  // Check for similar complaints using duplicate detection service
  const checkForSimilarComplaints = async (complaint: any) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const lat = complaint.location?.coordinates?.[1] ?? complaint.location?.latitude;
      const lng = complaint.location?.coordinates?.[0] ?? complaint.location?.longitude;
      const imageUrls = (complaint.media || []).map((m: any) => m.url).filter(Boolean).slice(0, 3);

      const response = await fetch(`${apiUrl}/ai/duplicate/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          complaintId: complaint._id || complaint.id || 'new',
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          municipality: complaint.municipalityName,
          latitude: lat,
          longitude: lng,
          imageUrls,
          submittedAt: complaint.createdAt,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        let matches = [];
        
        if (data && data.topMatches && Array.isArray(data.topMatches)) {
          matches = data.topMatches;
        } else if (data && data.matches && Array.isArray(data.matches)) {
          matches = data.matches;
        } else if (data && Array.isArray(data)) {
          matches = data;
        }

        const hasSimilar = matches.filter((m: any) => m.status !== "REJECTED" && (m.overallScore || 0) >= 0.65).length > 0;
        setSimilarComplaintsDetected(prev => ({
          ...prev,
          [complaint._id || complaint.id]: hasSimilar
        }));
      }
    } catch (error) {
      console.error('Error checking for similar complaints:', error);
    }
  };

  // Handle duplicate check (BL-25) - Using direct API call
  const handleCheckDuplicate = async (complaintId: string) => {
    console.log('handleCheckDuplicate called for complaintId:', complaintId);
    setDuplicateTarget(complaintId);
    setDuplicateLoading(true);
    setDuplicateComplaints([]);
    setDuplicateMatchScores({});
    try {
      const c = complaints.find((x) => (x._id || x.id) === complaintId);
      if (!c) {
        console.error('Complaint not found:', complaintId);
        return;
      }

      // Extract coordinates from GeoJSON or flat fields
      const lat = c.location?.coordinates?.[1] ?? c.location?.latitude;
      const lng = c.location?.coordinates?.[0] ?? c.location?.longitude;
      // Collect image URLs (max 3) for richer duplicate detection
      const imageUrls = (c.media || [])
        .map((m) => m.url)
        .filter(Boolean)
        .slice(0, 3);

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      console.log(
        'Making duplicate check request to:',
        `${apiUrl}/ai/duplicate/check`
      );
      const response = await fetch(`${apiUrl}/ai/duplicate/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          complaintId: c._id || c.id || 'new',
          title: c.title,
          description: c.description,
          category: c.category,
          municipality: c.municipalityName,
          latitude: lat,
          longitude: lng,
          imageUrls,
          submittedAt: c.createdAt,
        }),
      });
      const result = await response.json();

      console.log('Duplicate check response:', result);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // Check inside result.data (backend wraps response)
      const data = result.data || result;
      console.log('Parsed data:', data);
      console.log('Data has topMatches:', !!data.topMatches);
      console.log('TopMatches length:', data.topMatches?.length || 0);
      console.log('TopMatches sample:', data.topMatches?.slice(0, 2));
      console.log('Data has matches:', !!data.matches);
      console.log('Matches length:', data.matches?.length || 0);
      console.log('Data has candidates:', !!data.candidates);
      console.log('Candidates length:', data.candidates?.length || 0);
      console.log('Data isDuplicate:', data.isDuplicate);
      console.log('Data duplicateLevel:', data.duplicateLevel);

      // Handle different response structures
      let matches = [];
      const scores: Record<string, number> = {};

      if (data && data.topMatches && Array.isArray(data.topMatches)) {
        matches = data.topMatches;
        (
          data.topMatches as Array<{
            complaintId: string;
            overallScore?: number;
            similarity?: number;
          }>
        ).forEach((m) => {
          scores[m.complaintId] = Math.round(
            (m.overallScore ?? m.similarity ?? 0) * 100
          );
        });
      } else if (data && data.matches && Array.isArray(data.matches)) {
        matches = data.matches;
        (
          data.matches as Array<{
            complaintId: string;
            overallScore?: number;
            similarity?: number;
          }>
        ).forEach((m) => {
          scores[m.complaintId] = Math.round(
            (m.overallScore ?? m.similarity ?? 0) * 100
          );
        });
      } else if (data && data.candidates && Array.isArray(data.candidates)) {
        matches = data.candidates;
        (
          data.candidates as Array<{
            complaintId: string;
            overallScore?: number;
            similarity?: number;
          }>
        ).forEach((m) => {
          scores[m.complaintId] = Math.round(
            (m.overallScore ?? m.similarity ?? 0) * 100
          );
        });
      } else if (data && data.duplicates && Array.isArray(data.duplicates)) {
        matches = data.duplicates;
        (
          data.duplicates as Array<{
            complaintId: string;
            overallScore?: number;
            similarity?: number;
          }>
        ).forEach((m) => {
          scores[m.complaintId] = Math.round(
            (m.overallScore ?? m.similarity ?? 0) * 100
          );
        });
      } else if (data && Array.isArray(data)) {
        matches = data;
      } else {
        console.log('No duplicate matches found in response structure');
        console.log('Actual data keys:', data ? Object.keys(data) : 'data is null/undefined');
        console.log('Full data object:', JSON.stringify(data, null, 2));
      }

      if (matches.length > 0) {
        console.log('Processing matches:', matches.length);
        const matchIds = matches.map(
          (m: { complaintId: string }) => m.complaintId
        );
        console.log('Match IDs:', matchIds);
        console.log('Loaded complaint IDs:', complaints.map(c => c._id || c.id).slice(0, 5));
        setDuplicateMatchScores(scores);
        console.log('Duplicate match scores:', scores);
        // Match with loaded complaints first, then fall back to AI-provided titles
        const matched = complaints.filter((x) => {
          const id = x._id || x.id;
          const match = matchIds.includes(id);
          if (match) {
            console.log(`Match found: ${id}`);
          }
          return match;
        });
        console.log('Matched complaints from loaded list:', matched.length);
        
        // Build fallback objects for matches not in loaded list
        const matchedIds = new Set(matched.map(x => x._id || x.id));
        const unmatchedMatches = matches.filter(
          (m: { complaintId: string }) => !matchedIds.has(m.complaintId)
        );
        
        let allDuplicateComplaints = [...matched];
        
        if (unmatchedMatches.length > 0) {
          console.log('Building fallback objects for unmatched matches:', unmatchedMatches.length);
          const fallback = unmatchedMatches.map(
            (m: {
              complaintId: string;
              title?: string;
              status?: string;
              referenceId?: string;
            }) =>
              ({
                _id: m.complaintId,
                id: m.complaintId,
                title: m.title || m.complaintId,
                description: '',
                status: (m.status ||
                  'UNKNOWN') as import('@/types').ComplaintStatus,
                category: 'UNKNOWN' as import('@/types').ComplaintCategory,
                urgency: 'MEDIUM' as import('@/types').ComplaintUrgency,
                location: {},
                media: [],
                priorityScore: 0,
                createdBy: '',
                createdAt: '',
                updatedAt: '',
                referenceId: m.referenceId,
              }) as import('@/types').Complaint
          );
          allDuplicateComplaints = [...allDuplicateComplaints, ...fallback];
        }
        
        console.log('Setting duplicateComplaints with total items:', allDuplicateComplaints.length);
        setDuplicateComplaints(allDuplicateComplaints);
      } else {
        console.log('No matches found in response');
        setDuplicateComplaints([]);
      }
    } catch (error) {
      console.error('Duplicate check error:', error);
      setDuplicateComplaints([]);
    } finally {
      setDuplicateLoading(false);
      console.log(
        'Duplicate check complete, duplicateTarget:',
        duplicateTarget,
        'duplicateComplaints.length:',
        complaints.find((x) => (x._id || x.id) === duplicateTarget)
          ? duplicateComplaints.length
          : 'complaint not found'
      );
    }
  };

  const handleMergeComplaints = async (
    targetId: string,
    sourceIds: string[]
  ) => {
    setActionLoading(targetId);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      for (const sourceId of sourceIds) {
        const response = await fetch(`${apiUrl}/complaints/${sourceId}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            originalComplaintId: targetId,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();

          setComplaints(prevComplaints =>
            prevComplaints.map(c => {
              if ((c._id || c.id) === targetId && result.originalComplaint) {
                return {
                  ...c,
                  confirmationCount: result.originalComplaint.confirmationCount,
                  upvoteCount: result.originalComplaint.upvoteCount
                };
              }
              if ((c._id || c.id) === sourceId && result.mergedComplaint) {
                return {
                  ...c,
                  ...result.mergedComplaint,
                  status: 'REJECTED',
                  isDuplicate: true,
                  rejectionReason: 'duplicate',
                  rejectionReasonText: result.mergedComplaint.rejectionReasonText,
                  duplicateOf: result.mergedComplaint.duplicateOf || targetId,
                  duplicateOfReferenceId: result.mergedComplaint.duplicateOfReferenceId,
                  duplicateOfTitle: result.mergedComplaint.duplicateOfTitle,
                  mergedAt: result.mergedComplaint.mergedAt || new Date().toISOString(),
                  mergedBy: result.mergedComplaint.mergedBy,
                  duplicateStatus: 'CONFIRMED_DUPLICATE'
                };
              }
              return c;
            }).filter(c => statusFilter === 'ACTIVE' ? (c._id || c.id) !== sourceId : true)
          );
        }
      }
      
      alert(`Successfully merged ${sourceIds.length} complaints!`);
      setDuplicateTarget(null);
      setDuplicateComplaints([]);
      setMergeSourceId(null);
      setMergeSourceIds([]);
      await refreshComplaints();
    } catch (err) {
      alert('Failed to merge complaints');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle keep separate (BL-25)
  const handleKeepSeparate = async (targetId: string) => {
    setActionLoading(targetId);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/ai/duplicate/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newComplaintId: targetId,
          existingComplaintId: '',
          action: 'keep_separate',
        }),
      });
      alert('Complaints will be kept separate.');
      setDuplicateTarget(null);
      setDuplicateComplaints([]);
      setMergeSourceId(null);
      setMergeSourceIds([]);
      await refreshComplaints();
    } catch (err) {
      alert('Failed to process decision');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter complaints based on all filters
  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'ACTIVE' && ['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) return false;
    if (statusFilter === 'ARCHIVE' && !['CLOSED', 'REJECTED'].includes(c.status)) return false;
    if (statusFilter && !['ACTIVE', 'ARCHIVE'].includes(statusFilter) && c.status !== statusFilter) return false;
    if (categoryFilter && c.category !== categoryFilter) return false;
    if (priorityFilter) {
      if (priorityFilter === 'HIGH' && (c.priorityScore || 0) < 15)
        return false;
      if (
        priorityFilter === 'MEDIUM' &&
        ((c.priorityScore || 0) < 6 || (c.priorityScore || 0) >= 15)
      )
        return false;
      if (priorityFilter === 'LOW' && (c.priorityScore || 0) >= 6) return false;
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.description?.toLowerCase().includes(q) ||
      categoryLabels[c.category]?.toLowerCase().includes(q)
    );
  });

  // Calculate statistics - ONLY count based on SLA deadline passed
  const overdueCount = complaints.filter((c) => {
    // Exclude resolved/closed/rejected
    if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) return false;

    // ONLY count if SLA deadline is in the past (truly overdue)
    if (c.slaDeadline) {
      const deadlineDate = new Date(c.slaDeadline);
      return deadlineDate.getTime() < Date.now();
    }

    // NO fallback - if no deadline, don't count as overdue
    return false;
  }).length;

  const atRiskCount = complaints.filter((c) => {
    if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) return false;

    // Check if close to deadline (within 20% of time remaining)
    if (c.slaDeadline) {
      const deadlineDate = new Date(c.slaDeadline);
      const createdDate = new Date(c.createdAt);
      const nowDate = new Date();
      const totalMs = deadlineDate.getTime() - createdDate.getTime();
      const elapsedMs = nowDate.getTime() - createdDate.getTime();

      if (totalMs > 0 && elapsedMs > 0) {
        const progress = (elapsedMs / totalMs) * 100;
        return progress >= 80 && progress < 100;
      }
    }
    return false;
  }).length;

  const resolvedCount = complaints.filter(
    (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
  ).length;
  const highPriorityCount = complaints.filter(
    (c) => (c.priorityScore || 0) >= 15
  ).length;
  const avgDays =
    complaints.length > 0
      ? Math.round(
          (complaints.reduce((acc, c) => {
            const days =
              (Date.now() - new Date(c.createdAt).getTime()) /
              (1000 * 60 * 60 * 24);
            return acc + days;
          }, 0) /
            complaints.length) *
            10
        ) / 10
      : 0;
  const resolutionRate =
    complaints.length > 0
      ? Math.round((resolvedCount / Math.max(complaints.length, 1)) * 100)
      : 0;

  // Get categories count
  const byCategory: Record<string, number> = {};
  filteredComplaints.forEach((c) => {
    const cat = getCategoryLabel(c.category) || c.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

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
      c.referenceId || c._id?.slice(-6),
      c.title?.replace(/,/g, ' '),
      categoryLabels[c.category] || c.category,
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
    a.download = `agent_complaints_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    // Create printable content
    const content = filteredComplaints
      .map(
        (c) =>
          `${c.referenceId || c._id?.slice(-6)} | ${c.title || c.description?.slice(0, 50)} | ${c.status} | ${categoryLabels[c.category] || c.category} | ${c.municipalityName || ''}`
      )
      .join('\n');

    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Complaints Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #16a34a; }
              pre { white-space: pre-wrap; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f3f4f6; }
            </style>
          </head>
          <body>
            <h1>Agent Complaints Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Municipality: ${municipalityName || 'All'}</p>
            <p>Total: ${filteredComplaints.length} complaints</p>
            <table>
              <tr><th>Reference</th><th>Title</th><th>Status</th><th>Category</th><th>Municipality</th></tr>
              ${filteredComplaints
                .map(
                  (c) => `
                <tr>
                  <td>${c.referenceId || c._id?.slice(-6)}</td>
                  <td>${(c.title || c.description || '').slice(0, 50)}</td>
                  <td>${c.status}</td>
                  <td>${categoryLabels[c.category] || c.category}</td>
                  <td>${c.municipalityName || ''}</td>
                </tr>
              `
                )
                .join('')}
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!user || user.role !== 'MUNICIPAL_AGENT') return null;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/50">
        <PageHeader
          title="My Actions"
          subtitle={
            municipalityName
              ? `Complaints in ${municipalityName}`
              : 'Agent complaint management'
          }
          backHref="/dashboard"
          rightContent={
            <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
              {filteredComplaints.length} complaints
            </span>
          }
        />

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Complaints</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">
                    {complaints.length}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">All statuses</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Resolved</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {resolvedCount}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">At Risk (SLA)</p>
                  <p className="text-xs text-amber-500 mt-1">
                    Close to deadline
                  </p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">
                    {atRiskCount}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-2xl shadow-lg p-5 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Overdue</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">
                    {overdueCount}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Team Performance */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Performance Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">
                  {complaints.filter((c) => c.status === 'IN_PROGRESS').length}
                </p>
                <p className="text-xs text-slate-500 mt-1">In Progress</p>
                <p className="text-[10px] text-blue-400">
                  Currently being worked on
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">{avgDays}</p>
                <p className="text-xs text-slate-500 mt-1">Average Days</p>
                <p className="text-[10px] text-purple-400">Time to process</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">
                  {resolutionRate}%
                </p>
                <p className="text-xs text-slate-500 mt-1">Resolution Rate</p>
                <p className="text-[10px] text-emerald-400">
                  Percentage resolved
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-600">
                  {highPriorityCount}
                </p>
                <p className="text-xs text-slate-500 mt-1">High Priority</p>
                <p className="text-[10px] text-red-400">
                  Urgent issues (score 15+)
                </p>
              </div>
            </div>

            {/* Categories */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-600 mb-2">Categories:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(byCategory)
                  .slice(0, 5)
                  .map(([cat, count]) => (
                    <span
                      key={cat}
                      className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium"
                    >
                      {cat}: {count}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-slate-200">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              {/* Show Filters Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>

              {/* Export Buttons */}
              <div className="flex gap-2 ml-auto">
                <Button
                  onClick={exportCSV}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  onClick={exportPDF}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col md:flex-row gap-3 items-center">
                  {/* Search */}
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

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="ACTIVE">Active (My Actions)</option>
                    <option value="ARCHIVE">Archive / Rejected</option>
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="">All Categories</option>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="">All Priorities</option>
                    <option value="HIGH">High (≥15)</option>
                    <option value="MEDIUM">Medium (6-14)</option>
                    <option value="LOW">Low (&lt;6)</option>
                  </select>

                  {/* Results Count */}
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {filteredComplaints.length} results
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && <LoadingSpinner />}

          {/* Complaints List */}
          {!loading &&
            (filteredComplaints.length === 0 ? (
              <EmptyState
                icon="file"
                message={
                  searchTerm || statusFilter || categoryFilter || priorityFilter
                    ? t('common.tryAdjustingFilters')
                    : t('agent.noAssignedComplaints')
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
                      showMunicipality
                      index={index}
                      actions={
                        <>
                          {complaint.status === 'SUBMITTED' &&
                            !complaint.assignedDepartment && (
                              <>
                                <button
                                  onClick={() => {
                                    const c = complaints.find(
                                      (x) => (x._id || x.id) === id
                                    );
                                    setConfirmAction({
                                      type: 'validate',
                                      targetId: id,
                                      targetName: c?.title || ' Complaint',
                                    });
                                  }}
                                  disabled={actionLoading === id}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-primary/25"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  {actionLoading === id
                                    ? 'Validating...'
                                    : 'Validate'}
                                </button>
                                <button
                                  onClick={() => setRejectTarget(id)}
                                  disabled={actionLoading === id}
                                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all text-sm font-medium disabled:opacity-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </button>
                              </>
                            )}
                          {complaint.status === 'VALIDATED' &&
                            !complaint.assignedDepartment && (
                              <button
                                onClick={() => {
                                  setAssignTarget(id);
                                  // Fetch AI prediction
                                  const c = complaints.find(
                                    (x) => (x._id || x.id) === id
                                  );
                                  if (c) {
                                    agentService
                                      .predictDepartment(
                                        c.category,
                                        c.description || '',
                                        c.municipalityName || ''
                                      )
                                      .then((res) => {
                                        if (res.data) {
                                          setAiSuggestion({
                                            departmentId:
                                              res.data.suggestedDepartment,
                                            departmentName:
                                              res.data.departmentName,
                                            confidence: res.data.confidence,
                                          });
                                          if (res.data.suggestedDepartment)
                                            setSelectedDepartment(
                                              res.data.suggestedDepartment
                                            );
                                        }
                                      })
                                      .catch(() => {});
                                  }
                                }}
                                disabled={actionLoading === id}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all text-sm font-semibold disabled:opacity-50 hover:shadow-lg"
                              >
                                <Building className="w-4 h-4" />
                                Assign Department
                              </button>
                            )}
                          {complaint.status === 'ASSIGNED' &&
                            complaint.assignedDepartment && (
                              <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-100 text-green-700 rounded-xl text-sm font-semibold">
                                <CheckCircle className="w-4 h-4" />
                                {(() => {
                                      const assignedDept = complaint.assignedDepartment;
                                      if (typeof assignedDept === 'object' && assignedDept.name) {
                                        return `Assigned to ${getDepartmentLabel(assignedDept.name)}`;
                                      }
                                      if (typeof assignedDept === 'string') {
                                        const dept = departments.find(
                                          (d) => d._id === assignedDept
                                        );
                                        return dept
                                          ? `Assigned to ${getDepartmentLabel(dept.name)}`
                                          : 'Department Assigned';
                                      }
                                      return 'Department Assigned';
                                    })()}
                              </div>
                            )}
                          {/* BL-25: Duplicate suggestion badge + action button */}
                          {(complaint.duplicateStatus ===
                            'POSSIBLE_DUPLICATE' ||
                            complaint.duplicateStatus ===
                              'PROBABLE_DUPLICATE') && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                              <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>
                                {t('agent.possibleDuplicate', {
                                  defaultValue: 'Possible duplicate detected',
                                })}
                              </span>
                            </div>
                          )}
                          {/* Similar complaint suggestion — only show if duplicates were detected */}
                          {complaint.status === 'SUBMITTED' &&
                            !complaint.assignedDepartment &&
                            similarComplaintsDetected[id] && (
                              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium">
                                <Copy className="w-4 h-4" />
                                Similar complaints detected
                              </div>
                            )}
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/complaints/${id}?from=agent`
                              )
                            }
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium"
                          >
                            <FileText className="w-4 h-4" />
                            View Details
                          </button>
                        </>
                      }
                    />
                  );
                })}
              </div>
            ))}
        </main>

        {/* Reject Modal */}
        <Modal
          isOpen={rejectTarget !== null}
          onClose={() => {
            setRejectTarget(null);
            setRejectReason('');
          }}
          title="Reject Complaint"
          description="Please provide a reason for rejecting this complaint."
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                disabled={actionLoading !== null}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
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
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
            rows={4}
            placeholder="Enter rejection reason..."
          />
        </Modal>

        {/* Assign Modal */}
        <Modal
          isOpen={assignTarget !== null}
          onClose={() => {
            setAssignTarget(null);
            setSelectedDepartment('');
            setAiSuggestion(null);
          }}
          title={t('departments.assignToDepartment')}
          description={t('departments.selectDepartmentDescription')}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setAssignTarget(null);
                  setSelectedDepartment('');
                  setAiSuggestion(null);
                }}
                disabled={actionLoading !== null}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                isLoading={actionLoading !== null}
                disabled={!selectedDepartment || actionLoading !== null}
              >
                Assign
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {aiSuggestion?.departmentName && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-sm font-medium text-blue-800">
                  AI suggests: {getDepartmentLabel(aiSuggestion.departmentName)}
                </span>
                <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full font-semibold">
                  {aiSuggestion.confidence}%
                </span>
              </div>
            )}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all"
            >
              <option value="">Choose Department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {getDepartmentLabel(dept.name)}
                </option>
              ))}
            </select>
          </div>
        </Modal>

        {/* Validate Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmAction.type === 'validate'}
          onClose={() =>
            setConfirmAction({ type: null, targetId: null, targetName: '' })
          }
          onConfirm={handleConfirmValidate}
          title="Validate Complaint"
          message={`Are you sure you want to validate this complaint "${confirmAction.targetName}"? It will be sent for department assignment.`}
          confirmText="Validate"
          variant="success"
          isLoading={actionLoading !== null}
        />

        {/* Assign Department Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmAction.type === 'assign'}
          onClose={() =>
            setConfirmAction({ type: null, targetId: null, targetName: '' })
          }
          onConfirm={() => {
            setConfirmAction({ type: null, targetId: null, targetName: '' });
            handleAssign();
          }}
          title="Assign to Department"
          message={`Are you sure you want to assign this complaint "${confirmAction.targetName}" to the selected department?`}
          confirmText="Assign"
          variant="warning"
          isLoading={actionLoading !== null}
        />

        {/* BL-25: Duplicate Detection Modal */}
        <Modal
          isOpen={duplicateTarget !== null}
          onClose={() => {
            setDuplicateTarget(null);
            setDuplicateComplaints([]);
            setMergeSourceId(null);
            setMergeSourceIds([]);
            setDuplicateMatchScores({});
          }}
          title="Duplicate Detection"
          description="Review potential duplicate complaints and decide whether to merge."
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setDuplicateTarget(null);
                  setDuplicateComplaints([]);
                  setMergeSourceId(null);
                  setMergeSourceIds([]);
                  setDuplicateMatchScores({});
                }}
              >
                Cancel
              </Button>
              {duplicateComplaints.length > 0 && (
                <Button onClick={() => handleKeepSeparate(duplicateTarget!)}>
                  Keep Separate
                </Button>
              )}
              {(mergeSourceIds.length > 0 || mergeSourceId) &&
                duplicateComplaints.length > 0 && (
                  <Button
                    onClick={() =>
                      handleMergeComplaints(
                        duplicateTarget!,
                        mergeSourceIds.length > 0
                          ? mergeSourceIds
                          : [mergeSourceId!]
                      )
                    }
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Merge className="w-4 h-4 mr-2" />
                    Merge Selected (
                    {mergeSourceIds.length > 0 ? mergeSourceIds.length : 1})
                  </Button>
                )}
            </>
          }
        >
          {duplicateLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-600">
                  Checking for duplicates...
                </span>
              </div>
            ) : duplicateComplaints.length === 0 ? (
              <div className="text-center py-8">
                <Copy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600">No similar complaints found.</p>
                <p className="text-sm text-slate-500 mt-1">
                  This appears to be a unique complaint.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    Potential duplicates found!
                  </span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  These complaints appear similar. You can merge them or keep
                  them separate.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    Main complaint (target)
                  </p>
                  {(() => {
                    const c = complaints.find(
                      (x) => (x._id || x.id) === duplicateTarget
                    );
                    if (!c) return null;
                    const thumb = c.media?.[0]?.url ? getPhotoUrl(c.media[0].url) : null;
                    const location =
                      c.location?.address ||
                      c.location?.commune ||
                      c.municipalityName ||
                      '';
                    return (
                      <div className="flex gap-3">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={c.title}
                            className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm">
                            {c.title}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {c.description}
                          </p>
                          {location && (
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <X className="w-2.5 h-2.5" />
                              {location}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="text-sm text-slate-500 mb-2">
                  Select complaints to merge:
                </div>
                {duplicateComplaints.map((c) => {
                  const cid = c._id || c.id || '';
                  const score = duplicateMatchScores[cid];
                  const thumb = c.media?.[0]?.url;
                  const location =
                    c.location?.address ||
                    c.location?.commune ||
                    c.municipalityName ||
                    '';
                  return (
                    <div
                      key={cid}
                      onClick={() => {
                        setMergeSourceId(mergeSourceId === cid ? null : cid);
                        setMergeSourceIds((prev) =>
                          prev.includes(cid)
                            ? prev.filter((id) => id !== cid)
                            : [...prev, cid]
                        );
                      }}
                      className={`rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${
                        mergeSourceIds.includes(cid)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex gap-3 p-3">
                        {/* Thumbnail */}
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={c.title}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                mergeSourceIds.includes(cid)
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-slate-300'
                              }`}
                            >
                              {mergeSourceIds.includes(cid) && (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <p className="font-medium text-slate-900 text-sm truncate">
                              {c.title}
                            </p>
                            {score !== undefined && (
                              <span
                                className={`ml-auto flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                  score >= 80
                                    ? 'bg-red-100 text-red-700'
                                    : score >= 60
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {score}% similar
                              </span>
                            )}
                          </div>
                          {c.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 ml-7">
                              {c.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 ml-7 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded font-medium ${
                                c.status === 'RESOLVED' || c.status === 'CLOSED'
                                  ? 'bg-green-100 text-green-700'
                                  : c.status === 'IN_PROGRESS'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {t(`status.${c.status}`)}
                            </span>
                            <span>{getCategoryLabel(c.category)}</span>
                            {location && (
                              <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                                <X className="w-2.5 h-2.5 text-slate-300" />
                                {location}
                              </span>
                            )}
                            {c.referenceId && (
                              <span className="font-mono">{c.referenceId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(mergeSourceIds.length > 0 || mergeSourceId) && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-4">
                  <div className="flex items-center gap-2 text-purple-800">
                    <Merge className="w-5 h-5" />
                    <span className="font-medium">Merge ready</span>
                  </div>
                  <p className="text-sm text-purple-700 mt-1">
                    Click Merge Selected to combine complaints into one
                    transparent case. Citizen confirmations and support count
                    will be preserved.
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
