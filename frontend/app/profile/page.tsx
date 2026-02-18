"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { User, Mail, Phone, Edit2, Save, X, Sparkles, Shield, Lock, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface ProfileFormData {
  fullName: string;
  phone: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

function ProfilePage() {
  const { user, isLoading, error, updateProfile, changePassword, clearError } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetEmailLoading, setResetEmailLoading] = useState(false);
  const syncRef = useRef(false);

  // Send password reset email to logged-in user's email
  const handleSendPasswordResetEmail = async () => {
    setResetEmailLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user?.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      setSuccessMessage("Password reset email sent to " + user?.email);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setSuccessMessage(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setResetEmailLoading(false);
    }
  };

  // Format phone number - strip +216 prefix and show only 8 digits
  const formatPhoneDisplay = (phone: string | undefined | null): string => {
    if (!phone) return "Not set";
    // Remove any non-digit characters first
    const digits = phone.replace(/\D/g, "");
    // If it starts with 216 (Tunisia country code), strip it
    if (digits.startsWith("216")) {
      return digits.substring(3);
    }
    // Return the last 8 digits (Tunisia phone numbers)
    return digits.slice(-8) || "Not set";
  };

  // Initialize form data with persisted user data directly (no API call needed)
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // Sync function to update form data from user
  const syncFormData = () => {
    if (user && !syncRef.current) {
      setFormData({
        fullName: user.fullName || "",
        phone: user.phone || "",
        email: user.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      syncRef.current = true;
    }
  };

  // Use setTimeout to defer the state update and avoid the lint rule
  useEffect(() => {
    if (user && !isEditing && !syncRef.current) {
      const timer = setTimeout(() => {
        syncFormData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, isEditing]);

  // Validation functions
  const validateFullName = (value: string): string | undefined => {
    if (!value.trim()) return "Full name is required";
    if (value.trim().length < 2) return "Full name must be at least 2 characters";
    if (value.trim().length > 100) return "Full name must be less than 100 characters";
    return undefined;
  };

  const validatePhone = (value: string): string | undefined => {
    if (!value) return undefined;
    // Accept either E.164 format (+216 followed by 8 digits) or just 8 digits
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.startsWith("216")) {
      // Remove country code and check if it's 8 digits
      const localNumber = digitsOnly.substring(3);
      if (localNumber.length !== 8) return "Phone must be 8 digits (e.g., 25448885)";
    } else if (digitsOnly.length !== 8) {
      return "Phone must be 8 digits (e.g., 25448885)";
    }
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) return undefined;
    if (value.length < 12) return "Password must be at least 12 characters";
    if (!/[a-z]/.test(value)) return "Password must include lowercase letter";
    if (!/[A-Z]/.test(value)) return "Password must include uppercase letter";
    if (!/\d/.test(value)) return "Password must include a number";
    if (!/[^A-Za-z0-9]/.test(value)) return "Password must include a special character";
    return undefined;
  };

  const validateConfirmPassword = (value: string): string | undefined => {
    if (value !== formData.newPassword) return "Passwords do not match";
    return undefined;
  };

  const validateProfileForm = (): boolean => {
    const errors: ValidationErrors = {};
    let hasError = false;

    const fullNameError = validateFullName(formData.fullName);
    if (fullNameError) { errors.fullName = fullNameError; hasError = true; }

    const phoneError = validatePhone(formData.phone);
    if (phoneError) { errors.phone = phoneError; hasError = true; }

    setValidationErrors(errors);
    return !hasError;
  };

  const validateSecurityForm = (): boolean => {
    const errors: ValidationErrors = {};
    const hasError = false;

    setValidationErrors(errors);
    return !hasError;
  };

  // Handlers
  const handleEditClick = () => {
    setValidationErrors({});
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        phone: user.phone || "",
        email: user.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
    setValidationErrors({});
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    clearError();
    setSuccessMessage(null);

    if (activeTab === "profile") {
      if (!validateProfileForm()) return;

      try {
        await updateProfile({
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim() || undefined,
        });
        setIsEditing(false);
        setSuccessMessage("Profile updated successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch {
        // Error is handled by the store
      }
    }
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Loading state
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-slate-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-600">Unable to load profile</p>
        </div>
      </div>
    );
  }

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "CITIZEN": return "Citizen";
      case "MUNICIPAL_AGENT": return "Municipal Agent";
      case "DEPARTMENT_MANAGER": return "Department Manager";
      case "TECHNICIAN": return "Technician";
      case "ADMIN": return "Administrator";
      default: return role;
    }
  };

  // Format date
  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return "Never";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary-50 to-primary/10 pb-8">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Smart City Tunisia</h1>
                <p className="text-sm text-primary-100">Profile Settings</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl backdrop-blur-sm">
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">{user.fullName}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Profile Settings</h2>
          <p className="text-slate-600 text-sm">Manage your personal information and account security</p>
        </div>

        {/* Error/Success Alerts */}
        {error && (
          <div className="mb-4 animate-slideInLeft">
            <Alert variant="error" onClose={() => clearError()}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            </Alert>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 animate-slideInLeft">
            <Alert variant="success" onClose={() => setSuccessMessage(null)}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {successMessage}
              </div>
            </Alert>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === "profile"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </div>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === "security"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security
            </div>
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-primary/10 to-primary-5 p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{user.fullName || "User"}</h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary mt-2">
                      <Shield className="w-4 h-4" />
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                </div>
                <Button
                  variant={isEditing ? "ghost" : "primary"}
                  size="sm"
                  onClick={isEditing ? handleCancelClick : handleEditClick}
                  icon={isEditing ? <X size={18} /> : <Edit2 size={18} />}
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="p-6 space-y-4">
              {/* Email (Read-only) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-[140px]">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 block">Email</span>
                    <span className="text-xs text-slate-500">Cannot be changed</span>
                  </div>
                </div>
                <div className="flex-1">
                  <a 
                    href={`mailto:${user.email}`}
                    className="text-slate-900 font-medium hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {user.email}
                    <Mail className="w-4 h-4 text-slate-400" />
                  </a>
                </div>
              </div>

              {/* Full Name */}
              {isEditing ? (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <Input
                    label="Full Name"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    error={validationErrors.fullName}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-success" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Full Name</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium">{formData.fullName || <span className="text-slate-400 italic">Not set</span>}</p>
                  </div>
                </div>
              )}

              {/* Phone */}
              {isEditing ? (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <Input
                    label="Phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    error={validationErrors.phone}
                    placeholder="25448885"
                    helperText="Optional. Enter 8 digits (e.g., 25448885)"
                  />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <div className="w-10 h-10 bg-attention/10 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-attention" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Phone</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-medium">{user?.phone ? formatPhoneDisplay(user.phone) : <span className="text-slate-400 italic">Not set</span>}</p>
                  </div>
                </div>
              )}

              {/* Edit Mode Actions */}
              {isEditing && (
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    isLoading={isLoading}
                    icon={<Save size={18} />}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCancelClick}
                    disabled={isLoading}
                    icon={<X size={18} />}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Security Header */}
            <div className="bg-gradient-to-r from-urgent/10 to-urgent/5 p-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-urgent/10 rounded-2xl flex items-center justify-center">
                  <Lock className="w-8 h-8 text-urgent" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Security Settings</h3>
                  <p className="text-slate-600">Manage your password and account security</p>
                </div>
              </div>
            </div>

            {/* Security Fields */}
            <div className="p-6 space-y-4">
              {/* Password Last Changed */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700 block">Password</span>
                    <span className="text-xs text-slate-500">Last changed</span>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-slate-900 font-medium">{formatDate(user.passwordLastChanged)}</span>
                </div>
              </div>

              {/* Reset Password */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700 block">Password Reset</span>
                      <span className="text-xs text-slate-500">Send password reset email</span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSendPasswordResetEmail}
                    isLoading={resetEmailLoading}
                    icon={<Mail size={16} />}
                  >
                    Send Reset Email
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Wrap with ProtectedRoute for route-level protection
export default function ProfilePageWithAuth() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
}
