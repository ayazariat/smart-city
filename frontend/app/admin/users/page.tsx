"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  LogOut,
  MapPin,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { adminService, AdminUser, UserRole, UserStats } from "@/services/admin.service";
import { TUNISIA_GEOGRAPHY, getMunicipalitiesByGovernorate } from "@/data/tunisia-geography";

const ROLE_LABELS: Record<UserRole, string> = {
  CITIZEN: "Citizen",
  MUNICIPAL_AGENT: "Municipal Agent",
  DEPARTMENT_MANAGER: "Department Manager",
  TECHNICIAN: "Technician",
  ADMIN: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  CITIZEN: "bg-blue-100 text-blue-700",
  MUNICIPAL_AGENT: "bg-attention/10 text-attention",
  DEPARTMENT_MANAGER: "bg-purple-100 text-purple-700",
  TECHNICIAN: "bg-green-100 text-green-700",
  ADMIN: "bg-red-100 text-red-700",
};

// Roles that can have commune assignment
const ROLES_REQUIRING_COMMUNE: UserRole[] = ["CITIZEN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN"];

// Roles that can have department assignment
const ROLES_REQUIRING_DEPARTMENT: UserRole[] = ["DEPARTMENT_MANAGER", "TECHNICIAN"];

/**
 * Admin User Management Page with Autocomplete
 */
export default function AdminUsersPage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search
  const [search, setSearch] = useState("");

  // Departments
  const [departments, setDepartments] = useState<Array<{_id: string; name: string}>>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // track timeout IDs so we can clear on unmount
  const timeoutsRef = useRef<number[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, []);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    role: "CITIZEN" as UserRole,
    phone: "",
    governorate: "",
    municipality: "",
    department: "",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    isActive: true,
    role: "CITIZEN" as UserRole,
    governorate: "",
    municipality: "",
    department: "",
  });

  // Geography data - using local TUNISIA_GEOGRAPHY for autocomplete
  const municipalities = useMemo(() => {
    if (!createForm.governorate) return [];
    return getMunicipalitiesByGovernorate(createForm.governorate);
  }, [createForm.governorate]);

  const editMunicipalities = useMemo(() => {
    if (!editForm.governorate) return [];
    return getMunicipalitiesByGovernorate(editForm.governorate);
  }, [editForm.governorate]);

  // Check admin access
  const { hydrated } = useAuthStore();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    setIsAuthReady(true);

    if (!token) {
      router.push("/");
    } else if (user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [token, user, router, hydrated]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!hydrated || !isAuthReady) return;

    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getUsers({
        page,
        limit: 10,
        search: search || undefined,
      });
      setUsers(response.users);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, hydrated, isAuthReady]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const statsData = await adminService.getUserStats();
      setStats(statsData);
    } catch (_err) {
      // Silently handle stats fetch error
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const depts = await adminService.getDepartments();
      setDepartments(depts);
    } catch (_err) {
      // Silently handle departments fetch error
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchUsers();
      fetchStats();
      fetchDepartments();
    }
  }, [user, fetchUsers]);

  // Check if role requires commune
  const requiresMunicipality = (role: UserRole) => ROLES_REQUIRING_COMMUNE.includes(role);

  // Check if role requires department
  const requiresDepartment = (role: UserRole) => ROLES_REQUIRING_DEPARTMENT.includes(role);

  // Validate form field
  const validateField = (field: string, value: string, formRole?: UserRole): string => {
    const currentRole = formRole || createForm.role;
    switch (field) {
      case "fullName":
        if (!value.trim()) return "Le nom complet est requis";
        if (value.length < 2) return "Le nom doit contenir au moins 2 caractères";
        return "";
      case "email":
        if (!value.trim()) return "L'email est requis";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Format d'email invalide";
        return "";
      case "phone":
        if (value) {
          const cleanPhone = value.replace(/[\s-]/g, "");
          const phoneRegex = /^(\+216|216)?[2459]\d{7}$/;
          if (!phoneRegex.test(cleanPhone)) return "Format invalide. Ex: +21629123456";
        }
        return "";
      case "governorate":
        if (requiresMunicipality(currentRole) && !value) return "Governorate is required";
        return "";
      case "municipality":
        if (requiresMunicipality(currentRole) && !value) return "Commune is required";
        return "";
      case "department":
        if (requiresDepartment(currentRole) && !value) return "Le département est requis";
        return "";
      default:
        return "";
    }
  };

  // Handle input change with validation
  const handleCreateFormChange = (field: string, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (createErrors[field]) {
      setCreateErrors((prev) => ({ ...prev, [field]: "" }));
    }
    // Clear municipality when governorate changes
    if (field === "governorate") {
      setCreateForm(prev => ({ ...prev, municipality: "" }));
    }
    // Clear department when role changes to non-department role
    if (field === "role") {
      if (!ROLES_REQUIRING_DEPARTMENT.includes(value as UserRole)) {
        setCreateForm(prev => ({ ...prev, department: "" }));
      }
    }
  };

  // Handle create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const errors: Record<string, string> = {};
    errors.fullName = validateField("fullName", createForm.fullName);
    errors.email = validateField("email", createForm.email);
    errors.phone = validateField("phone", createForm.phone);
    errors.governorate = validateField("governorate", createForm.governorate);
    errors.municipality = validateField("municipality", createForm.municipality);
    errors.department = validateField("department", createForm.department);

    const hasErrors = Object.values(errors).some((error) => error !== "");
    if (hasErrors) {
      setCreateErrors(errors);
      return;
    }

    try {
      await adminService.createUser({
        ...createForm,
        department: createForm.department || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({
        fullName: "",
        email: "",
        role: "CITIZEN",
        phone: "",
        governorate: "",
        municipality: "",
        department: "",
      });
      setCreateErrors({});
      setSuccess("User created successfully!");
      setError(null);
      fetchUsers();
      fetchStats();
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      let message = "";
      if (typeof err === "string") {
        message = err;
      } else if (err instanceof Error) {
        message = err.message;
      }

      const safeMessage = message.toLowerCase();

      if (safeMessage.includes("email") && (safeMessage.includes("existe déjà") || safeMessage.includes("already exists"))) {
        setCreateErrors((prev) => ({
          ...prev,
          email: "Un compte existe déjà avec cet email.",
        }));
        setError(null);
        return;
      }

      if (safeMessage.includes("nom") && (safeMessage.includes("existe déjà") || safeMessage.includes("already exists"))) {
        setCreateErrors((prev) => ({
          ...prev,
          fullName: "A user with this name already exists.",
        }));
        setError(null);
        return;
      }

      setError("Unable to create user at the moment. Please try again or contact an administrator.");
    }
  };

  // Handle update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await adminService.updateUser(selectedUser.id, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        isActive: editForm.isActive,
        governorate: editForm.governorate,
        municipality: editForm.municipality,
        department: editForm.department || undefined,
      });

      if (editForm.role !== selectedUser.role) {
        await adminService.updateUserRole(selectedUser.id, {
          role: editForm.role,
        });
      }

      setShowEditModal(false);
      setSelectedUser(null);
      setSuccess("User updated successfully!");
      setError(null);
      fetchUsers();
      fetchStats();
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await adminService.toggleUserActive(userId, isActive);
      setSuccess(isActive ? "User activated successfully" : "User deactivated successfully");
      setError(null);
      fetchUsers();
      fetchStats();
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user status");
      setSuccess(null);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      await adminService.deleteUser(userId);
      setSuccess("User deleted successfully!");
      setError(null);
      fetchUsers();
      fetchStats();
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  // Open edit modal
  const openEditModal = (userItem: AdminUser) => {
    setSelectedUser(userItem);
    setEditForm({
      fullName: userItem.fullName,
      phone: userItem.phone || "",
      isActive: userItem.isActive,
      role: userItem.role,
      governorate: userItem.governorate || "",
      municipality: typeof userItem.municipality === 'string' ? userItem.municipality : userItem.municipality?.name || "",
      department: userItem.department?._id || userItem.department?.name || "",
    });
    setShowEditModal(true);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <>
      <div className="app">
      {/* Reuse dashboard shell: left sidebar + main area */}
      <div className="sidebar">
        <div className="sb-logo">
          <div className="sb-icon">
            <Users className="w-5 h-5 text-[var(--green)]" />
          </div>
          <div>
            <div className="sb-name">Smart City{`\n`}Tunisia</div>
            <div className="sb-sub">Admin Panel</div>
          </div>
        </div>
        <div className="sb-user">
          <div className="sb-avt">{user?.fullName?.charAt(0).toUpperCase() || "A"}</div>
          <div className="sb-uname">{user?.fullName || "Admin"}</div>
          <span className="sb-urole">Administrator</span>
        </div>
        <div className="sb-nav">
          <div className="sb-section">Navigation</div>
          <Link href="/dashboard" className="sb-item">
            <span className="sb-ic">
              <Users className="w-4 h-4" />
            </span>
            Dashboard
          </Link>
          <Link href="/admin/complaints" className="sb-item">
            <span className="sb-ic">
              <Users className="w-4 h-4" />
            </span>
            Complaints
          </Link>
          <button className="sb-item active" type="button">
            <span className="sb-ic">
              <Users className="w-4 h-4" />
            </span>
            Users
          </button>
          <Link href="/archive" className="sb-item">
            <span className="sb-ic">
              <Users className="w-4 h-4" />
            </span>
            Archives
          </Link>
        </div>
        <div className="sb-footer">
          <button
            className="sb-logout"
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="main">
        {/* Topbar consistent with SmartCity design system */}
        <div className="topbar">
          <div>
            <div className="topbar-title">User Management</div>
            <div className="topbar-sub">Manage system users and permissions</div>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="tb-btn primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Main content styled like SmartCity cards/tables */}
        <main className="page">
          {/* Stats Cards */}
          {stats && (
            <div className="grid4" style={{ marginBottom: 18 }}>
              <div className="stat-card au" style={{ borderTopColor: "var(--blue)" }}>
                <div className="stat-n" style={{ color: "var(--blue)" }}>{stats.total}</div>
                <div className="stat-l">Total Users</div>
              </div>
              <div className="stat-card au" style={{ borderTopColor: "var(--green3)" }}>
                <div className="stat-n" style={{ color: "var(--green3)" }}>{stats.active}</div>
                <div className="stat-l">Active</div>
              </div>
              <div className="stat-card au" style={{ borderTopColor: "var(--orange)" }}>
                <div className="stat-n" style={{ color: "var(--orange)" }}>{stats.inactive}</div>
                <div className="stat-l">Inactive</div>
              </div>
              <div className="stat-card au" style={{ borderTopColor: "var(--red)" }}>
                <div className="stat-n" style={{ color: "var(--red)" }}>
                  {Array.isArray(stats?.byRole)
                    ? stats.byRole.find((r) => r._id === "ADMIN")?.count || 0
                    : 0}
                </div>
                <div className="stat-l">Administrators</div>
              </div>
            </div>
          )}

          {/* Error / success alerts */}
          {error && (
            <div
              className="alert"
              style={{
                background: "var(--redbg)",
                borderColor: "var(--redbdr)",
                marginBottom: 16,
              }}
            >
              <div className="alert-icon" style={{ background: "var(--red)", color: "#fff" }}>
                !
              </div>
              <div style={{ fontSize: 12, color: "var(--red)" }}>{error}</div>
            </div>
          )}
          {success && (
            <div
              className="alert"
              style={{
                background: "var(--accentbg)",
                borderColor: "var(--accentbdr)",
                marginBottom: 16,
              }}
            >
              <div className="alert-icon" style={{ background: "var(--accent)", color: "var(--green)" }}>
                ✓
              </div>
              <div style={{ fontSize: 12, color: "var(--green3)" }}>{success}</div>
            </div>
          )}

          {/* Search */}
          <form onSubmit={handleSearch} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="search-wrap">
                <span className="search-ic">
                  <Search className="w-4 h-4 text-[var(--txt4)]" />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-inp"
                  placeholder="Search users by name or email..."
                />
              </div>
              <button type="submit" className="btn primary sm" style={{ whiteSpace: "nowrap" }}>
                Search
              </button>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  fetchUsers();
                }}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Users table in SmartCity style */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="utbl">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Municipality</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            className="avatar-sm"
                            style={{
                              background: "var(--bg3)",
                              color: "var(--green3)",
                            }}
                          >
                            {userItem.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{userItem.fullName}</div>
                            <div style={{ fontSize: 11, color: "var(--txt3)" }}>{userItem.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: "var(--purbg)",
                            color: "var(--purple)",
                            borderColor: "var(--purbdr)",
                          }}
                        >
                          {ROLE_LABELS[userItem.role]}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--txt2)" }}>
                        {userItem.municipality ? (
                          <span>
                            {typeof userItem.municipality === "string"
                              ? userItem.municipality
                              : userItem.municipality?.name}
                            {userItem.governorate ? `, ${userItem.governorate}` : ""}
                          </span>
                        ) : (
                          <span style={{ color: "var(--txt4)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--txt2)" }}>
                        {userItem.phone || "—"}
                      </td>
                      <td>
                        {userItem.isActive ? (
                          <span
                            className="badge"
                            style={{
                              background: "var(--accentbg)",
                              color: "var(--green3)",
                              borderColor: "var(--accentbdr)",
                            }}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              background: "var(--bg3)",
                              color: "var(--txt3)",
                              borderColor: "var(--bdr)",
                            }}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="btn secondary sm btn icon-only"
                            onClick={() => openEditModal(userItem)}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="btn warn sm btn icon-only"
                            onClick={() =>
                              handleToggleActive(userItem.id, !userItem.isActive)
                            }
                          >
                            {userItem.isActive ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn danger sm btn icon-only"
                            onClick={() => handleDeleteUser(userItem.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} style={{ padding: 24, textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: "var(--txt3)" }}>
                          No users found.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination row */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderTop: "1px solid var(--bdr)",
                  fontSize: 11,
                  color: "var(--txt3)",
                }}
              >
                <span>
                  Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    disabled={page === 1}
                    className="btn secondary sm btn icon-only"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    className="btn secondary sm btn icon-only"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Add New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => handleCreateFormChange("fullName", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.fullName ? "border-red-500" : "border-slate-200"}`}
                  placeholder="Enter full name"
                />
                {createErrors.fullName && <p className="text-red-500 text-xs mt-1">{createErrors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => handleCreateFormChange("email", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.email ? "border-red-500" : "border-slate-200"}`}
                  placeholder="exemple@email.com"
                />
                {createErrors.email && <p className="text-red-500 text-xs mt-1">{createErrors.email}</p>}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  An activation link will be sent to the user by email to set their password.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setCreateForm({ ...createForm, role: newRole, governorate: "", municipality: "" });
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Governorate with Autocomplete */}
              {requiresMunicipality(createForm.role) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Commune
                  </label>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Gouvernorat *
                  </label>
                  <input
                    type="text"
                    list="create-governorate-list"
                    value={createForm.governorate}
                    onChange={(e) => handleCreateFormChange("governorate", e.target.value)}
                    placeholder="Type to search..."
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.governorate ? "border-red-500" : "border-slate-200"}`}
                    autoComplete="off"
                  />
                  <datalist id="create-governorate-list">
                    {TUNISIA_GEOGRAPHY.map((g) => (
                      <option key={g.governorate} value={g.governorate} />
                    ))}
                  </datalist>
                  {createErrors.governorate && <p className="text-red-500 text-xs mt-1">{createErrors.governorate}</p>}
                </div>
              )}
              {/* Commune with Autocomplete */}
              {requiresMunicipality(createForm.role) && createForm.governorate && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Municipalité *
                  </label>
                  <input
                    type="text"
                    list="create-municipality-list"
                    value={createForm.municipality}
                    onChange={(e) => handleCreateFormChange("municipality", e.target.value)}
                    placeholder="Type to search..."
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.municipality ? "border-red-500" : "border-slate-200"}`}
                    autoComplete="off"
                  />
                  <datalist id="create-municipality-list">
                    {municipalities.map((mun) => (
                      <option key={mun} value={mun} />
                    ))}
                  </datalist>
                  {createErrors.municipality && <p className="text-red-500 text-xs mt-1">{createErrors.municipality}</p>}
                </div>
              )}
              {/* Department - only for DEPARTMENT_MANAGER and TECHNICIAN */}
              {requiresDepartment(createForm.role) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Département *
                  </label>
                  <select
                    value={createForm.department}
                    onChange={(e) => handleCreateFormChange("department", e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.department ? "border-red-500" : "border-slate-200"}`}
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {createErrors.department && <p className="text-red-500 text-xs mt-1">{createErrors.department}</p>}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone (optionnel)</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => handleCreateFormChange("phone", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.phone ? "border-red-500" : "border-slate-200"}`}
                  placeholder="+21629123456"
                />
                {createErrors.phone && <p className="text-red-500 text-xs mt-1">{createErrors.phone}</p>}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateErrors({});
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={selectedUser?.email || ""}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setEditForm({ ...editForm, role: newRole, governorate: "", municipality: "" });
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Governorate with Autocomplete */}
              {requiresMunicipality(editForm.role) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Gouvernorat
                  </label>
                  <input
                    type="text"
                    list="edit-governorate-list"
                    value={editForm.governorate}
                    onChange={(e) => setEditForm({ ...editForm, governorate: e.target.value, municipality: "" })}
                    placeholder="Type to search..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    autoComplete="off"
                  />
                  <datalist id="edit-governorate-list">
                    {TUNISIA_GEOGRAPHY.map((g) => (
                      <option key={g.governorate} value={g.governorate} />
                    ))}
                  </datalist>
                </div>
              )}
              {/* Commune with Autocomplete */}
              {requiresMunicipality(editForm.role) && editForm.governorate && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Municipalité
                  </label>
                  <input
                    type="text"
                    list="edit-municipality-list"
                    value={editForm.municipality}
                    onChange={(e) => setEditForm({ ...editForm, municipality: e.target.value })}
                    placeholder="Type to search..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    autoComplete="off"
                  />
                  <datalist id="edit-municipality-list">
                    {editMunicipalities.map((mun) => (
                      <option key={mun} value={mun} />
                    ))}
                  </datalist>
                </div>
              )}
              {/* Department - only for DEPARTMENT_MANAGER and TECHNICIAN */}
              {requiresDepartment(editForm.role) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Département
                  </label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isActive: true })}
                    className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${editForm.isActive
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isActive: false })}
                    className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${!editForm.isActive
                      ? "bg-red-50 text-red-600 border border-red-200"
                      : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
