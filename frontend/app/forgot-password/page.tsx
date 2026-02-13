"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Sparkles, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset link");
      }

      setSuccess("If an account exists with this email, a password reset link has been sent.");
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
                  Check Your Email
                </h1>
                <p className="text-slate-600">
                  {success}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Check your spam folder if you don&apos;t see the email within a few minutes.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/forgot-password"
                  onClick={() => { setSuccess(null); setError(null); }}
                  className="block w-full text-center text-primary hover:text-primary-700 font-medium transition-colors"
                >
                  Didn&apos;t receive the email? Try again
                </Link>
                <Link
                  href="/"
                  className="block w-full text-center text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center justify-center gap-2"
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

  return (
    <>
      <AnimatedBackground />
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 animate-fadeIn">
            <Link href="/" className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-2xl mb-4 shadow-xl shadow-primary/25 hover-lift cursor-pointer">
              <Sparkles className="w-8 h-8 text-white" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Forgot Password?
            </h1>
            <p className="text-slate-600">
              No worries! Enter your email and we&apos;ll send you a reset link.
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
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  icon={<Mail size={18} />}
                  required
                />
              </div>

              <div className="animate-slideInLeft delay-400">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  fullWidth
                  size="lg"
                  className="group"
                  icon={<Mail className="w-5 h-5" />}
                >
                  Send Reset Link
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 animate-fadeIn delay-500">
              <Link 
                href="/" 
                className="flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-all duration-200"
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
