"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Sparkles, ArrowLeft, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const mt = (key: string, fallback?: string) => mounted ? t(key) : (fallback ?? '');
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
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 animate-scaleIn">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-success/20 rounded-2xl mb-4 shadow-xl">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  {mt('forgotPassword.checkEmail')}
                </h1>
                <p className="text-slate-600">
                  {success}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>{mt('forgotPassword.tip')}</strong> {mt('forgotPassword.spamHint')}
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/forgot-password"
                  onClick={() => { setSuccess(null); setError(null); }}
                  className="block w-full text-center text-primary hover:text-primary-700 font-medium transition-colors"
                >
                  {mt('forgotPassword.didntReceive')}
                </Link>
                <Link
                  href="/"
                  className="block w-full text-center text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {mt('forgotPassword.backToLogin')}
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
              {mt('forgotPassword.title')}
            </h1>
            <p className="text-slate-600">
              {mt('forgotPassword.subtitle')}
            </p>
            <div className="mt-3">
              <Link 
                href="/transparency" 
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-50/80 text-green-700 border border-green-200/60 hover:bg-green-100 transition-colors text-sm font-medium shadow-sm"
              >
                <BarChart3 className="w-4 h-4" />
                {mt('forgotPassword.publicStats')}
              </Link>
            </div>
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
                  label={mt('forgotPassword.email', 'Email')}
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mt('forgotPassword.emailPlaceholder')}
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
                  {mt('forgotPassword.sendLink', 'Send Reset Link')}
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 animate-fadeIn delay-500">
              <Link 
                href="/" 
                className="flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                {mt('forgotPassword.backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
