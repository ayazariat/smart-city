"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  ArrowLeft,
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

// Roles that can have municipality assignment
const ROLES_REQUIRING_MUNICIPALITY: UserRole[] = ["CITIZEN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN"];

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

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search
  const [search, setSearch] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    role: "CITIZEN" as UserRole,
    phone: "",
    governorate: "",
    municipality: "",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    isActive: true,
    role: "CITIZEN" as UserRole,
    governorate: "",
    municipality: "",
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

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchUsers();
      fetchStats();
    }
  }, [user, fetchUsers]);

  // Check if role requires municipality
  const requiresMunicipality = (role: UserRole) => ROLES_REQUIRING_MUNICIPALITY.includes(role);

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
        if (requiresMunicipality(currentRole) && !value) return "Le gouvernorat est requis";
        return "";
      case "municipality":
        if (requiresMunicipality(currentRole) && value && !value) return "La municipalité est requise";
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

    const hasErrors = Object.values(errors).some((error) => error !== "");
    if (hasErrors) {
      setCreateErrors(errors);
      return;
    }

    try {
      await adminService.createUser(createForm);
      setShowCreateModal(false);
      setCreateForm({
        fullName: "",
        email: "",
        role: "CITIZEN",
        phone: "",
        governorate: "",
        municipality: "",
      });
      setCreateErrors({});
      fetchUsers();
      fetchStats();
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
      });

      if (editForm.role !== selectedUser.role) {
        await adminService.updateUserRole(selectedUser.id, {
          role: editForm.role,
        });
      }

      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await adminService.toggleUserActive(userId, isActive);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user status");
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      await adminService.deleteUser(userId);
      fetchUsers();
      fetchStats();
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
      municipality: userItem.municipality || "",
    });
    setShowEditModal(true);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // Loading state
  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">User Management</h1>
                  <p className="text-sm text-primary-100">Admin Panel</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">User Management</h2>
            <p className="text-slate-600">Manage system users and their permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-all hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add New User
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-100">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-slate-600">Total Users</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-100">
              <div className="text-2xl font-bold text-success">{stats.active}</div>
              <div className="text-sm text-slate-600">Active Users</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-100">
              <div className="text-2xl font-bold text-slate-500">{stats.inactive}</div>
              <div className="text-sm text-slate-600">Inactive Users</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-100">
              <div className="text-2xl font-bold text-attention">
                {stats.byRole.find((r) => r._id === "ADMIN")?.count || 0}
              </div>
              <div className="text-sm text-slate-600">Administrators</div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-all"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
                fetchUsers();
              }}
              className="bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-300 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Users Table - Desktop View */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">User</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Location</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Phone</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-slate-900">{userItem.fullName}</div>
                        <div className="text-sm text-slate-500">{userItem.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[userItem.role]}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {ROLE_LABELS[userItem.role]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {userItem.municipality && userItem.governorate ? (
                        <div className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3" />
                          <span>{userItem.municipality}</span>
                          <span className="text-slate-400">({userItem.governorate})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {userItem.phone || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {userItem.isActive ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(userItem)}
                          className="p-2 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(userItem.id, !userItem.isActive)}
                          className={`p-2 rounded-lg transition-colors ${userItem.isActive
                            ? "text-attention hover:bg-attention/10"
                            : "text-success hover:bg-success/10"
                            }`}
                          title={userItem.isActive ? "Deactivate user" : "Activate user"}
                        >
                          {userItem.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userItem.id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <div className="text-sm text-slate-600">
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} users
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {users.map((userItem) => (
            <div key={userItem.id} className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
              {/* User Info Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold text-slate-900">{userItem.fullName}</div>
                  <div className="text-sm text-slate-500">{userItem.email}</div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[userItem.role]}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {ROLE_LABELS[userItem.role]}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Location */}
                <div>
                  <div className="text-xs text-slate-400 mb-1">Location</div>
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <MapPin className="w-3 h-3" />
                    {userItem.municipality && userItem.governorate ? (
                      <span>{userItem.municipality}, {userItem.governorate}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <div className="text-xs text-slate-400 mb-1">Phone</div>
                  <div className="text-sm text-slate-600">
                    {userItem.phone || "-"}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 mb-1">Status</div>
                  {userItem.isActive ? (
                    <span className="inline-flex items-center gap-1 text-success text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 text-sm">
                      <XCircle className="w-4 h-4" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(userItem)}
                  className="flex-1 flex items-center justify-center gap-2 p-2 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors text-sm font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(userItem.id, !userItem.isActive)}
                  className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors text-sm font-medium ${userItem.isActive
                    ? "text-attention hover:bg-attention/10"
                    : "text-success hover:bg-success/10"
                    }`}
                >
                  {userItem.isActive ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteUser(userItem.id)}
                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-lg border border-slate-100">
              <div className="text-sm text-slate-600">
                {((page - 1) * 10 + 1)}-{Math.min(page * 10, total)} of {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {users.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-8 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No users found</h3>
            <p className="text-slate-600 mb-4">
              {search ? "Try adjusting your search criteria" : "Get started by adding a new user"}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add New User
              </button>
            )}
          </div>
        )}
      </main>

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
                  placeholder="Entrez le nom complet"
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
              {/* Municipality with Autocomplete */}
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
                  Annuler
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
                  value={selectedUser.email}
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
              {/* Municipality with Autocomplete */}
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
    </div>
  );
}
