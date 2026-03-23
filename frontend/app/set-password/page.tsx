"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldCheck, Sparkles, Eye, EyeOff } from "lucide-react";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ReCaptchaBadge, refreshRecaptchaToken } from "@/components/ui/ReCaptchaBadge";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setError("Invalid activation link. Please contact your administrator.");
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError("Password must contain uppercase, lowercase letters and numbers");
      return;
    }

    setLoading(true);
    
    try {
      await authService.setPassword(token!, email!, password);
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/?activated=true");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Account Activated!
              </h1>
              <p className="text-slate-600 mb-6">
                Your password has been set successfully. You can now log in to your account.
              </p>
              <Link
                href="/"
                className="inline-block w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
              >
                Go to Login
              </Link>
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
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-primary-900">
              Set Your Password
            </h1>
            <p className="text-slate-600">
              Create a password to activate your account
            </p>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 animate-scaleIn delay-200">
            {error && (
              <Alert variant="error">{error}</Alert>
            )}

            {email && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-600">
                  Setting password for: <span className="font-semibold text-slate-900">{email}</span>
                </p>
              </div>
            )}

            <div className="space-y-5">
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    disabled={!token || !email || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Confirm your password"
                    disabled={!token || !email || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Requirements */}
              <div className="text-sm text-slate-500 space-y-1">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className={password.length >= 8 ? "text-green-600" : ""}>At least 8 characters</li>
                  <li className="text-green-600">Contains uppercase and lowercase letters</li>
                  <li className="text-green-600">Contains numbers</li>
                </ul>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={loading}
              fullWidth
              size="lg"
              disabled={loading || !token || !email}
              className="group"
            >
              {loading ? "Setting Password..." : "Set Password & Activate Account"}
            </Button>
          </form>

          {/* ReCAPTCHA Badge */}
          <div className="mt-6 animate-fadeIn">
            <ReCaptchaBadge action="setPassword" />
          </div>
        </div>
      </div>
    </>
  );
}
