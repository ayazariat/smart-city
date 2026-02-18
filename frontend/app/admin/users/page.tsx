"use client";

import { useState, useEffect, useCallback } from "react";
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
import { adminService, AdminUser, UserRole, UserStats, GovernorateData } from "@/services/admin.service";

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

// Roles that require municipality assignment
const ROLES_REQUIRING_MUNICIPALITY: UserRole[] = ["MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "TECHNICIAN"];

/**
 * Admin User Management Page
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

  // Geography data
  const [geography, setGeography] = useState<GovernorateData[]>([]);
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [loadingGeography, setLoadingGeography] = useState(false);

  // Check admin access
  const { hydrated } = useAuthStore();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Wait for auth store to hydrate before checking access
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
    // Wait for auth store to hydrate before fetching users
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
      setError(err instanceof Error ? err.message : "Échec de chargement des utilisateurs");
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

  // Fetch geography data
  const fetchGeography = async () => {
    try {
      setLoadingGeography(true);
      const geoData = await adminService.getGeography();
      setGeography(geoData);
    } catch (_err) {
      // Silently handle geography fetch error
    } finally {
      setLoadingGeography(false);
    }
  };

  // Handle governorate change - update municipalities
  const handleGovernorateChange = (governorate: string, formType: 'create' | 'edit') => {
    const selectedGeo = geography.find(g => g.governorate === governorate);
    setMunicipalities(selectedGeo?.municipalities || []);

    if (formType === 'create') {
      setCreateForm(prev => ({ ...prev, governorate, municipality: "" }));
    } else {
      setEditForm(prev => ({ ...prev, governorate, municipality: "" }));
    }
  };

  // Check if role requires municipality
  const requiresMunicipality = (role: UserRole) => ROLES_REQUIRING_MUNICIPALITY.includes(role);

  // Validate form field
  const validateField = (field: string, value: string): string => {
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
        if (requiresMunicipality(createForm.role) && !value) return "Le gouvernorat est requis";
        return "";
      case "municipality":
        if (requiresMunicipality(createForm.role) && createForm.governorate && !value) return "La municipalité est requise";
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
  };

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchUsers();
      fetchStats();
      fetchGeography();
    }
  }, [user, fetchUsers]);

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

    // Check if there are any errors
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
      setMunicipalities([]);
      fetchUsers();
      fetchStats();
    } catch (err: unknown) {
      // Normalise backend error message (apiClient may throw a string or an Error)
      let message = "";
      if (typeof err === "string") {
        message = err;
      } else if (err instanceof Error) {
        message = err.message;
      }

      const safeMessage = message.toLowerCase();

      // Email already exists -> show error next to email field, not as a global alert
      if (
        safeMessage.includes("email") &&
        (safeMessage.includes("existe déjà") || safeMessage.includes("already exists"))
      ) {
        setCreateErrors((prev) => ({
          ...prev,
          email: "Un compte existe déjà avec cet email.",
        }));
        // Ne pas afficher un message d'erreur global dans ce cas
        setError(null);
        return;
      }

      // Full name already exists -> show error next to full name field
      if (
        safeMessage.includes("nom") &&
        (safeMessage.includes("existe déjà") || safeMessage.includes("already exists"))
      ) {
        setCreateErrors((prev) => ({
          ...prev,
          fullName: "Un utilisateur existe déjà avec ce nom.",
        }));
        setError(null);
        return;
      }

      // Generic, security-friendly message for all other errors
      setError(
        "Impossible de créer l'utilisateur pour le moment. Veuillez réessayer ou contacter un administrateur."
      );
    }
  };

  // Handle update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      // Update basic info
      await adminService.updateUser(selectedUser.id, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        isActive: editForm.isActive,
        governorate: editForm.governorate,
        municipality: editForm.municipality,
      });

      // Update role if changed
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
  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName,
      phone: user.phone || "",
      isActive: user.isActive,
      role: user.role,
      governorate: user.governorate || "",
      municipality: user.municipality || "",
    });
    // Set municipalities for existing governorate
    if (user.governorate) {
      const selectedGeo = geography.find(g => g.governorate === user.governorate);
      setMunicipalities(selectedGeo?.municipalities || []);
    } else {
      setMunicipalities([]);
    }
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

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">User</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 hidden md:table-cell">Rôle</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 hidden lg:table-cell">Municipalité</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 hidden lg:table-cell">Téléphone</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 hidden lg:table-cell">Statut</th>
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
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[userItem.role]}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {ROLE_LABELS[userItem.role]}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
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
                    <td className="px-4 py-4 hidden lg:table-cell text-slate-600">
                      {userItem.phone || "-"}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
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
                  Un lien d&apos;activation sera envoyé à l&apos;utilisateur par email pour définir son mot de passe.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setCreateForm({ ...createForm, role: newRole, governorate: "", municipality: "" });
                    setMunicipalities([]);
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
              {/* Governorate Selection - Only for roles requiring municipality */}
              {requiresMunicipality(createForm.role) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Gouvernorat *
                  </label>
                  <select
                    value={createForm.governorate}
                    onChange={(e) => {
                      handleCreateFormChange("governorate", e.target.value);
                      handleGovernorateChange(e.target.value, 'create');
                    }}
                    disabled={loadingGeography}
                    required
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100 ${createErrors.governorate ? "border-red-500" : "border-slate-200"}`}
                  >
                    <option value="">Sélectionner un gouvernorat</option>
                    {geography.map((geo) => (
                      <option key={geo.governorate} value={geo.governorate}>
                        {geo.governorate}
                      </option>
                    ))}
                  </select>
                  {createErrors.governorate && <p className="text-red-500 text-xs mt-1">{createErrors.governorate}</p>}
                </div>
              )}
              {/* Municipality Selection - Only for roles requiring municipality */}
              {requiresMunicipality(createForm.role) && createForm.governorate && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Municipalité *
                  </label>
                  <select
                    value={createForm.municipality}
                    onChange={(e) => handleCreateFormChange("municipality", e.target.value)}
                    required
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.municipality ? "border-red-500" : "border-slate-200"}`}
                  >
                    <option value="">Sélectionner une municipalité</option>
                    {municipalities.map((mun) => (
                      <option key={mun} value={mun}>
                        {mun}
                      </option>
                    ))}
                  </select>
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
                    setMunicipalities([]);
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
              {/* Governorate Selection - Only for roles requiring municipality */}
              {requiresMunicipality(editForm.role) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Gouvernorat
                  </label>
                  <select
                    value={editForm.governorate}
                    onChange={(e) => handleGovernorateChange(e.target.value, 'edit')}
                    disabled={loadingGeography}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
                  >
                    <option value="">Sélectionner un gouvernorat</option>
                    {geography.map((geo) => (
                      <option key={geo.governorate} value={geo.governorate}>
                        {geo.governorate}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Municipality Selection - Only for roles requiring municipality */}
              {requiresMunicipality(editForm.role) && editForm.governorate && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Municipalité
                  </label>
                  <select
                    value={editForm.municipality}
                    onChange={(e) => setEditForm({ ...editForm, municipality: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sélectionner une municipalité</option>
                    {municipalities.map((mun) => (
                      <option key={mun} value={mun}>
                        {mun}
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
    </div>
  );
}
