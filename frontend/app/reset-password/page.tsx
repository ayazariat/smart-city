"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Sparkles, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  // Password validation
  const validatePassword = (value: string): string | undefined => {
    if (!value) return "Password is required";
    if (value.length < 12) return "Password must be at least 12 characters";
    if (!/[a-z]/.test(value)) return "Password must include lowercase letter";
    if (!/[A-Z]/.test(value)) return "Password must include uppercase letter";
    if (!/\d/.test(value)) return "Password must include a number";
    if (!/[^A-Za-z0-9]/.test(value)) return "Password must include a special character";
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    const passwordError = validatePassword(password);
    if (passwordError) {
      setValidationErrors({ password: passwordError });
      return;
    }

    if (password !== confirmPassword) {
      setValidationErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    if (!token || !userId) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userId,
          token,
          newPassword: password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-8 animate-scaleIn">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-success/20 rounded-2xl mb-4 shadow-xl">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Password Reset!
                </h1>
                <p className="text-slate-600">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>

              <Button
                onClick={() => router.push("/")}
                fullWidth
                size="lg"
                icon={<Sparkles className="w-5 h-5" />}
              >
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!token || !userId) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-8 animate-scaleIn">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4 shadow-xl">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Invalid Reset Link
                </h1>
                <p className="text-slate-600">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/forgot-password"
                  className="block w-full"
                >
                  <Button fullWidth size="lg">
                    Request New Reset Link
                  </Button>
                </Link>
                <Link
                  href="/"
                  className="block w-full"
                >
                  <Button fullWidth size="lg" variant="outline">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-2xl mb-4 shadow-xl shadow-primary/25">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Set New Password
            </h1>
            <p className="text-slate-600">
              Your password must be different from previously used passwords.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 animate-scaleIn delay-200">
            {error && (
              <div className="mb-6 animate-slideInLeft">
                <Alert variant="error" onClose={() => setError(null)}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="animate-slideInLeft delay-300">
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors({ ...validationErrors, password: undefined });
                      }
                    }}
                    error={validationErrors.password}
                    placeholder="Enter new password"
                    icon={<Lock size={18} />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Must include uppercase, lowercase, number, and special character
                </p>
              </div>

              <div className="animate-slideInLeft delay-400">
                <div className="relative">
                  <Input
                    label="Confirm New Password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (validationErrors.confirmPassword) {
                        setValidationErrors({ ...validationErrors, confirmPassword: undefined });
                      }
                    }}
                    error={validationErrors.confirmPassword}
                    placeholder="Confirm new password"
                    icon={<Lock size={18} />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="animate-slideInLeft delay-500">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  fullWidth
                  size="lg"
                  className="group"
                  icon={<Lock className="w-5 h-5" />}
                >
                  Reset Password
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 animate-fadeIn delay-500">
              <Link 
                href="/" 
                className="flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
