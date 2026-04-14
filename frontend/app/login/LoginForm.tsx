"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Sparkles, BarChart3 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ReCaptchaBadge, refreshRecaptchaToken } from "@/components/ui/ReCaptchaBadge";
import { clearClientAuthTokens } from "@/lib/api";
import { useTranslation } from "react-i18next";

function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activatedParam = useMemo(
    () => searchParams.get("activated") === "true",
    [searchParams]
  );
  const { login, isLoading, error, user, hydrated, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState(() =>
    activatedParam ? t('login.activated') : ""
  );

  useEffect(() => {
    if (activatedParam) {
      window.history.replaceState({}, "", "/login");
    }
  }, [activatedParam]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (!hydrated) return;

    if (user) {
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      router.replace(redirectTo);
      return;
    }
  }, [user, router, hydrated, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    clearClientAuthTokens();

    let captchaToken: string | undefined;
    const recaptchaEnabled = !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (recaptchaEnabled) {
      const freshToken = await refreshRecaptchaToken();
      if (!freshToken) {
        setLocalError(t('login.captchaFailed'));
        return;
      }
      captchaToken = freshToken;
    }

    try {
      await login({
        email: formData.email,
        password: formData.password,
        captchaToken,
      });
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      router.replace(redirectTo);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('login.loginFailed'));
    }
  };

  return (
    <>
      <AnimatedBackground />
      
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 animate-fadeIn">
            <Link href="/transparency" className="inline-block">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-2xl mb-4 shadow-xl shadow-primary/25 hover-lift">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-primary-900">
              {t('login.title')}
            </h1>
            <p className="text-slate-600">
              {t('login.subtitle')}
            </p>
            <div className="mt-3">
              <Link 
                href="/transparency" 
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-50/80 text-green-700 border border-green-200/60 hover:bg-green-100 transition-colors text-sm font-medium shadow-sm"
              >
                <BarChart3 className="w-4 h-4" />
                {t('login.publicStats')}
              </Link>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 animate-scaleIn delay-200">
            {(error || localError) && (
              <div className="mb-6 animate-slideInLeft">
                <Alert variant="error" onClose={() => setLocalError("")}>
                  {error || localError}
                </Alert>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 animate-slideInLeft">
                <Alert variant="success" onClose={() => setSuccessMessage("")}>
                  {successMessage}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="animate-slideInLeft delay-300">
                <Input
                  label={t('login.email')}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('login.emailPlaceholder')}
                  icon={<Mail size={18} />}
                  required
                />
              </div>

              <div className="animate-slideInLeft delay-400">
                <Input
                  label={t('login.password')}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('login.passwordPlaceholder')}
                  icon={<Lock size={18} />}
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm animate-slideInLeft delay-500">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0 transition-all duration-200 cursor-pointer"
                  />
                  <span className="text-slate-600 group-hover:text-slate-900 transition-colors">
                    {t('login.rememberMe')}
                  </span>
                </label>
                <a 
                  href="/forgot-password" 
                  className="text-primary hover:text-primary-700 font-medium transition-all duration-200 hover:underline"
                >
                  {t('login.forgotPassword')}
                </a>
              </div>

              <div className="animate-slideInLeft delay-500">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  fullWidth
                  size="lg"
                  className="group"
                >
                  {t('login.signIn')}
                </Button>
              </div>

              <div className="animate-fadeIn delay-500">
                <ReCaptchaBadge action="login" />
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 animate-fadeIn delay-500">
              <p className="text-center text-sm text-slate-600">
                {t('login.noAccount')}{" "}
                <Link 
                  href="/register" 
                  className="text-primary hover:text-primary-700 font-semibold transition-all duration-200 hover:underline"
                >
                  {t('login.createAccount')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export { LoginForm };
