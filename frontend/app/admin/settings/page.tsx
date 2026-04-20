"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Clock, Tag, Plus, Edit2, Trash2, Save,
  AlertTriangle, CheckCircle, Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient } from "@/services/api.client";
import { showToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Department {
  _id: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  categories: string[];
}

interface SLARule {
  category: string;
  urgency: string;
  deadlineHours: number;
}

const ALL_CATEGORIES = [
  "ROAD", "LIGHTING", "WASTE", "WATER", "SAFETY",
  "PUBLIC_PROPERTY", "GREEN_SPACE", "TRAFFIC", "URBAN_PLANNING", "EQUIPMENT", "OTHER",
];

const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const CATEGORY_LABELS: Record<string, string> = {
  ROAD: "Road & Infrastructure", LIGHTING: "Street Lighting", WASTE: "Waste Management",
  WATER: "Water & Sanitation", SAFETY: "Public Safety", PUBLIC_PROPERTY: "Public Property",
  GREEN_SPACE: "Green Spaces", TRAFFIC: "Traffic", URBAN_PLANNING: "Urban Planning",
  EQUIPMENT: "Equipment", OTHER: "Other",
};

const DEFAULT_SLA_HOURS: Record<string, number> = {
  LOW: 168, MEDIUM: 72, HIGH: 48, URGENT: 24,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"departments" | "sla" | "categories">("departments");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [slaRules, setSlaRules] = useState<SLARule[]>([]);
  const [loading, setLoading] = useState(true);

  // Department modal state
  const [deptModal, setDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: "", description: "", email: "", phone: "", categories: [] as string[] });
  const [savingDept, setSavingDept] = useState(false);

  // SLA form
  const [slaEditing, setSlaEditing] = useState<string | null>(null);
  const [slaForm, setSlaForm] = useState<Partial<SLARule>>({});
  const [savingSla, setSavingSla] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, slaRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; departments?: Department[]; data?: Department[] }>("/admin/departments"),
        apiClient.get<{ success: boolean; rules?: SLARule[]; data?: SLARule[] }>("/admin/sla-rules"),
      ]);

      if (deptRes.status === "fulfilled") {
        const d = deptRes.value;
        setDepartments(d.departments || d.data || []);
      }
      if (slaRes.status === "fulfilled") {
        const s = slaRes.value;
        setSlaRules(s.rules || s.data || buildDefaultSLARules());
      } else {
        setSlaRules(buildDefaultSLARules());
      }
    } catch {
      showToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const buildDefaultSLARules = (): SLARule[] =>
    ALL_CATEGORIES.flatMap((cat) =>
      URGENCY_LEVELS.map((urgency) => ({
        category: cat,
        urgency,
        deadlineHours: DEFAULT_SLA_HOURS[urgency] || 72,
      }))
    );

  // ── Department CRUD ─────────────────────────────────────────────────────────

  const openDeptModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({ name: dept.name, description: dept.description || "", email: dept.email || "", phone: dept.phone || "", categories: dept.categories || [] });
    } else {
      setEditingDept(null);
      setDeptForm({ name: "", description: "", email: "", phone: "", categories: [] });
    }
    setDeptModal(true);
  };

  const saveDepartment = async () => {
    if (!deptForm.name.trim()) return showToast("Department name is required", "error");
    setSavingDept(true);
    try {
      if (editingDept) {
        await apiClient.put(`/admin/departments/${editingDept._id}`, deptForm);
        showToast("Department updated", "success");
      } else {
        await apiClient.post("/admin/departments", deptForm);
        showToast("Department created", "success");
      }
      setDeptModal(false);
      loadData();
    } catch {
      showToast("Failed to save department", "error");
    } finally {
      setSavingDept(false);
    }
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm("Delete this department? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/admin/departments/${id}`);
      showToast("Department deleted", "success");
      loadData();
    } catch {
      showToast("Failed to delete department", "error");
    }
  };

  // ── SLA Rules ───────────────────────────────────────────────────────────────

  const saveSlaRule = async (rule: SLARule) => {
    setSavingSla(true);
    try {
      const updatedRules = slaRules.map((r) =>
        r.category === rule.category && r.urgency === rule.urgency ? { ...r, ...slaForm } : r
      );
      await apiClient.put("/admin/sla-rules", { rules: updatedRules });
      setSlaRules(updatedRules);
      setSlaEditing(null);
      showToast("SLA rule updated", "success");
    } catch {
      showToast("Failed to update SLA rule", "error");
    } finally {
      setSavingSla(false);
    }
  };

  if (!user || user.role !== "ADMIN") return null;

  const tabClass = (tab: string) =>
    `px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
      activeTab === tab
        ? "bg-primary text-white shadow-md"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/50">
        <PageHeader
          title="System Settings"
          subtitle="Manage departments, SLA rules, and platform configuration"
          backHref="/dashboard"
        />

        <main className="max-w-6xl mx-auto px-4 py-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 bg-white rounded-2xl p-2 shadow-sm border border-slate-200">
            <button onClick={() => setActiveTab("departments")} className={tabClass("departments")}>
              <Building2 className="w-4 h-4 inline mr-2" />Departments
            </button>
            <button onClick={() => setActiveTab("sla")} className={tabClass("sla")}>
              <Clock className="w-4 h-4 inline mr-2" />SLA Rules
            </button>
            <button onClick={() => setActiveTab("categories")} className={tabClass("categories")}>
              <Tag className="w-4 h-4 inline mr-2" />Categories
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ── Departments Tab ─────────────────────────── */}
              {activeTab === "departments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Departments ({departments.length})</h3>
                    <Button onClick={() => openDeptModal()} className="flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Department
                    </Button>
                  </div>

                  {departments.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No departments configured yet.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {departments.map((dept) => (
                        <div key={dept._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900">{dept.name}</h4>
                              {dept.description && <p className="text-sm text-slate-500 mt-1">{dept.description}</p>}
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {(dept.categories || []).map((cat) => (
                                  <span key={cat} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                    {CATEGORY_LABELS[cat] || cat}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                {dept.email && <span>✉ {dept.email}</span>}
                                {dept.phone && <span>☎ {dept.phone}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                              <button onClick={() => openDeptModal(dept)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                                <Edit2 className="w-4 h-4 text-slate-500" />
                              </button>
                              <button onClick={() => deleteDepartment(dept._id)} className="p-2 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── SLA Rules Tab ────────────────────────────── */}
              {activeTab === "sla" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">SLA deadlines define how long each complaint can remain open before being flagged as overdue. Each category can have different deadlines per urgency level. Changes apply to new complaints only.</p>
                  </div>

                  {ALL_CATEGORIES.map((cat) => (
                    <div key={cat} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono rounded">{cat}</span>
                        <span className="text-sm font-semibold text-slate-700">{CATEGORY_LABELS[cat] || cat}</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Urgency</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Hours</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Label</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {URGENCY_LEVELS.map((urgency) => {
                            const rule = slaRules.find((r) => r.category === cat && r.urgency === urgency) || { category: cat, urgency, deadlineHours: DEFAULT_SLA_HOURS[urgency] };
                            const key = `${cat}__${urgency}`;
                            const isEditing = slaEditing === key;
                            const urgencyColor = urgency === "URGENT" ? "text-red-700 bg-red-100" : urgency === "HIGH" ? "text-orange-700 bg-orange-100" : urgency === "MEDIUM" ? "text-amber-700 bg-amber-100" : "text-green-700 bg-green-100";
                            return (
                              <tr key={urgency} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${urgencyColor}`}>{urgency}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  {isEditing ? (
                                    <input type="number" min="1" max="8760" value={slaForm.deadlineHours ?? rule.deadlineHours}
                                      onChange={(e) => setSlaForm({ deadlineHours: parseInt(e.target.value) || 24 })}
                                      className="w-24 px-2 py-1 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                                  ) : (
                                    <span className="font-mono font-semibold text-slate-800">{rule.deadlineHours}h</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 text-xs">
                                  {rule.deadlineHours >= 168 ? `${Math.round(rule.deadlineHours / 24)} days` : rule.deadlineHours >= 24 ? `${Math.round(rule.deadlineHours / 24)}d` : `${rule.deadlineHours}h`}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button onClick={() => saveSlaRule(rule)} disabled={savingSla} className="flex items-center gap-1 px-2.5 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                                        {savingSla ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                                      </button>
                                      <button onClick={() => setSlaEditing(null)} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">Cancel</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => { setSlaEditing(key); setSlaForm({ deadlineHours: rule.deadlineHours }); }} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200 ml-auto">
                                      <Edit2 className="w-3 h-3" /> Edit
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Categories Tab ───────────────────────────── */}
              {activeTab === "categories" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                    Complaint categories are built-in and fixed across the app. Assign categories to departments in the <button onClick={() => setActiveTab("departments")} className="underline font-medium">Departments tab</button>.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ALL_CATEGORIES.map((cat) => {
                      const deptHandling = departments.filter((d) => d.categories?.includes(cat));
                      return (
                        <div key={cat} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-800 text-sm">{CATEGORY_LABELS[cat] || cat}</span>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono rounded-lg">{cat}</span>
                          </div>
                          <div className="space-y-1">
                            {deptHandling.length > 0 ? (
                              deptHandling.map((d) => (
                                <div key={d._id} className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  <span>{d.name}</span>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span>No department assigned</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Department Modal */}
      <Modal
        isOpen={deptModal}
        onClose={() => setDeptModal(false)}
        title={editingDept ? "Edit Department" : "Add Department"}
        description="Configure department details and which complaint categories it handles."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeptModal(false)} disabled={savingDept}>Cancel</Button>
            <Button onClick={saveDepartment} isLoading={savingDept}>
              {editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Department Name *</label>
            <input
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="e.g. Roads & Infrastructure"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Optional description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={deptForm.email}
                onChange={(e) => setDeptForm({ ...deptForm, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="dept@city.tn"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input
                value={deptForm.phone}
                onChange={(e) => setDeptForm({ ...deptForm, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="+216..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Handles Categories</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {ALL_CATEGORIES.map((cat) => {
                const checked = deptForm.categories.includes(cat);
                return (
                  <label key={cat} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${checked ? "bg-primary/10 border border-primary/30" : "border border-slate-200 hover:bg-slate-50"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setDeptForm({ ...deptForm, categories: checked ? deptForm.categories.filter((c) => c !== cat) : [...deptForm.categories, cat] })}
                      className="w-3.5 h-3.5 accent-primary"
                    />
                    <span className={checked ? "text-primary font-medium" : "text-slate-600"}>{CATEGORY_LABELS[cat] || cat}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
