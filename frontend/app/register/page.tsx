"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Phone, Sparkles, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ReCaptchaBadge, refreshRecaptchaToken } from "@/components/ui/ReCaptchaBadge";

/**
 * Registration Page - Smart City Tunisia
 * Modern interface with Civic Green palette and real-time validation
 */
export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, deletePendingRegistration } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setLocalError("");
    
    // Clear error for modified field
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" });
    }

    // Real-time password match validation
    if (name === "confirmPassword" || name === "password") {
      if (name === "confirmPassword" && value !== formData.password) {
        setFieldErrors({ ...fieldErrors, confirmPassword: "Passwords do not match" });
      } else if (name === "password" && formData.confirmPassword && value !== formData.confirmPassword) {
        setFieldErrors({ ...fieldErrors, confirmPassword: "Passwords do not match" });
      } else {
        setFieldErrors({ ...fieldErrors, confirmPassword: "" });
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email format validation (strict)
    const emailRegex = /^[^^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address (e.g. name@example.com)";
    }

    // Strong password validation (mirror backend policy)
    // - Min 12 chars
    // - At least 1 lowercase, 1 uppercase, 1 digit, 1 special char
    const passwordPolicyRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

    if (!passwordPolicyRegex.test(formData.password)) {
      errors.password =
        "Password must be at least 12 characters and include uppercase, lowercase, number, and special character.";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Optional phone: validate Tunisia format (8 digits) if provided
    if (formData.phone) {
      // Remove any non-digit characters
      const digits = formData.phone.replace(/\D/g, "");
      // Accept either 8 digits directly or +216 followed by 8 digits
      const validFormat = /^(?:\+216)?[2-9]\d{7}$/;
      if (!validFormat.test(digits) && !validFormat.test(formData.phone)) {
        errors.phone = "Please enter a valid Tunisian phone number (8 digits, e.g., 20555555).";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDeletePending = async () => {
    if (!formData.email) return;
    try {
      await deletePendingRegistration(formData.email);
      setLocalError("Pending registration deleted. You can now register again.");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to delete pending registration");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!validateForm()) {
      return;
    }

    let captchaToken: string | undefined;
    const recaptchaEnabled = !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (recaptchaEnabled) {
      // Get fresh reCAPTCHA token
      const freshToken = await refreshRecaptchaToken();
      if (!freshToken) {
        setLocalError("Failed to complete security check. Please refresh and try again.");
        return;
      }
      captchaToken = freshToken;
    }

    // Phone transformation: normalize to E.164 format +216XXXXXXXX if needed
    let phoneValue = formData.phone;
    if (formData.phone) {
      const digits = formData.phone.replace(/\D/g, "");
      // If user entered 8 digits without country code, add +216
      if (digits.length === 8 && !formData.phone.includes("+216")) {
        phoneValue = "+216" + digits;
      }
    }

    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: phoneValue,
        captchaToken,
      });
      // After registration, redirect to verification page
      router.push(`/verify-account?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const configs = [
      { strength: 1, label: 'Weak', color: 'bg-urgent-500' },
      { strength: 2, label: 'Fair', color: 'bg-attention-500' },
      { strength: 3, label: 'Good', color: 'bg-attention-400' },
      { strength: 4, label: 'Strong', color: 'bg-success-500' },
      { strength: 5, label: 'Very Strong', color: 'bg-success-600' },
    ];

    return configs[Math.min(strength, 5) - 1] || configs[0];
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <>
      <AnimatedBackground />
      
      <div className="min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8 animate-fadeIn">
            <Link 
              href="/" 
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-2xl mb-4 shadow-xl shadow-primary/25 hover-lift transition-all duration-300"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-primary-900">
              Create Account
            </h1>
            <p className="text-slate-600">
              Join Smart City Tunis to manage and report urban services
            </p>
            <div className="mt-3 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-white/80 shadow-sm text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-success-500" />
              <span>Step 1 of 3 · Create your secure civic account</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 animate-scaleIn delay-200">
            {(error || localError) && (
              <div className="mb-6 animate-slideInLeft">
                <Alert variant="error" onClose={() => setLocalError("")}>
                  {error || localError}
                  {error?.includes("pending registration") && (
                    <button
                      type="button"
                      onClick={handleDeletePending}
                      className="mt-2 text-sm underline hover:text-urgent-800"
                    >
                      Click here to delete the pending registration and try again
                    </button>
                  )}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="animate-slideInLeft delay-300">
                  <Input
                    label="Full Name"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    icon={<User size={18} />}
                    required
                  />
                </div>

                <div className="animate-slideInRight delay-300">
                  <Input
                    label="Email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    icon={<Mail size={18} />}
                    error={fieldErrors.email}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="animate-slideInLeft delay-400">
                  <Input
                    label="Phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="20XXXXXX (8 digits)"
                    icon={<Phone size={18} />}
                    error={fieldErrors.phone}
                    helperText="Optional. Enter 8 digits (e.g., 20555555)"
                  />
                </div>

                {/* Role is now fixed as CITIZEN on backend for public registration.
                    We deliberately hide any role selection here to avoid confusion and abuse. */}
              </div>

              <div className="animate-slideInLeft delay-500">
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  icon={<Lock size={18} />}
                  error={fieldErrors.password}
                  required
                />

                {formData.password && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Password strength:</span>
                      <span className={`font-medium ${passwordStrength.strength >= 3 ? 'text-success-700' : 'text-attention-700'}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="animate-slideInLeft delay-500">
                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  icon={<Lock size={18} />}
                  error={fieldErrors.confirmPassword}
                  required
                />
              </div>

              {/* Invisible reCAPTCHA v3 badge (UX-friendly) */}
              <div className="animate-fadeIn delay-500">
                <ReCaptchaBadge action="register" onTokenChange={setCaptchaToken} />
              </div>

              <div className="pt-2 animate-fadeIn delay-500">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  fullWidth
                  size="lg"
                  className="group"
                >
                  Create Account
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 animate-fadeIn delay-500">
              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link 
                  href="/" 
                  className="text-primary hover:text-primary-700 font-semibold transition-all duration-200 hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-8 animate-fadeIn delay-500">
            By creating an account, you agree to our Terms of Use and Privacy Policy
          </p>
        </div>
      </div>
    </>
  );
}
