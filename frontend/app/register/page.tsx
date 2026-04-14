"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Sparkles, MapPin, Navigation, BarChart3 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ReCaptchaBadge, refreshRecaptchaToken } from "@/components/ui/ReCaptchaBadge";
import { TUNISIA_GEOGRAPHY, getMunicipalitiesByGovernorate } from "@/data/tunisia-geography";
import { getLocationWithDetails, LocationData } from "@/services/geo.service";
import { useTranslation } from "react-i18next";

/**
 * Registration Page - Smart City Tunisia
 * Modern interface with Civic Green palette and real-time validation
 * Includes governorate and municipality autocomplete
 */
export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { register, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    governorate: "",
    municipality: "",
  });
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Get municipalities based on selected governorate
  const municipalities = useMemo(() => {
    if (!formData.governorate) return [];
    return getMunicipalitiesByGovernorate(formData.governorate);
  }, [formData.governorate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setLocalError("");
    
    // Clear error for modified field
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" });
    }

    // Clear municipality when governorate changes
    if (name === "governorate") {
      setFormData(prev => ({ ...prev, municipality: "" }));
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

    // FullName validation - minimum 3 characters
    if (!formData.fullName || formData.fullName.length < 3) {
      errors.fullName = t('register.errors.fullNameMin');
    }

    // Email format validation (strict)
    const emailRegex = /^[^^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = t('register.errors.emailInvalid');
    }

    // Password validation: min 8 characters
    if (formData.password.length < 8) {
      errors.password = t('register.errors.passwordMin');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('register.errors.passwordMismatch');
    }

    // Phone: required, validate Tunisia format (8 digits starting with 2-9)
    if (!formData.phone) {
      errors.phone = t('register.errors.phoneRequired');
    } else {
      const phoneRegex = /^[2-9][0-9]{7}$/;
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = t('register.errors.phoneInvalid');
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUseMyLocation = async () => {
    setLocationLoading(true);
    setLocationError("");
    
    try {
      const location: LocationData | null = await getLocationWithDetails();
      
      if (location) {
        setFormData(prev => ({
          ...prev,
          governorate: location.governorate,
          municipality: location.municipality,
        }));
      } else {
        setLocationError("Could not determine your location in Tunisia. Please select manually.");
      }
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "Failed to get location");
    } finally {
      setLocationLoading(false);
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
      const freshToken = await refreshRecaptchaToken();
      if (!freshToken) {
        setLocalError("Failed to complete security check. Please refresh and try again.");
        return;
      }
      captchaToken = freshToken;
    }

    // Phone: send 8 digits without +216 prefix
    const phoneValue = formData.phone;

    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: phoneValue,
        captchaToken,
        governorate: formData.governorate || undefined,
        municipality: formData.municipality || undefined,
      });
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
      { strength: 1, label: t('register.strengthWeak'), color: 'bg-urgent-500' },
      { strength: 2, label: t('register.strengthFair'), color: 'bg-attention-500' },
      { strength: 3, label: t('register.strengthGood'), color: 'bg-attention-400' },
      { strength: 4, label: t('register.strengthStrong'), color: 'bg-success-500' },
      { strength: 5, label: t('register.strengthVeryStrong'), color: 'bg-success-600' },
    ];

    return configs[Math.min(strength, 5) - 1] || configs[0];
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <>
      <AnimatedBackground />
      
      <div className="min-h-screen flex items-center justify-center p-4 py-6">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="text-center mb-5 animate-fadeIn">
            <Link 
              href="/" 
              className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-primary-700 rounded-xl mb-3 shadow-lg shadow-primary/25 hover-lift transition-all duration-300"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mb-1 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-primary-900">
              {t('register.title')}
            </h1>
            <p className="text-sm text-slate-600">
              {t('register.subtitle')}
            </p>
            <div className="mt-2">
              <Link 
                href="/transparency" 
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-50/80 text-green-700 border border-green-200/60 hover:bg-green-100 transition-colors text-xs font-medium shadow-sm"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {t('register.publicStats')}
              </Link>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 animate-scaleIn delay-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="animate-slideInLeft delay-300">
                  <Input
                    label={t('register.fullName')}
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder={t('register.fullNamePlaceholder')}
                    icon={<User size={18} />}
                    error={fieldErrors.fullName}
                    required
                  />
                </div>

                <div className="animate-slideInRight delay-300">
                  <Input
                    label={t('register.email')}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('register.emailPlaceholder')}
                    icon={<Mail size={18} />}
                    error={fieldErrors.email}
                    required
                  />
                </div>
              </div>

              {/* Governorate and Commune with Autocomplete */}
              <div className="animate-slideInLeft delay-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {t('register.location')}
                  </label>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locationLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Navigation className={`w-4 h-4 ${locationLoading ? 'animate-pulse' : ''}`} />
                    {locationLoading ? t('register.gettingLocation') : t('register.useMyLocation')}
                  </button>
                </div>
                
                {locationError && (
                  <p className="text-sm text-urgent-600 mb-2">{locationError}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      name="governorate"
                      value={formData.governorate}
                      onChange={handleChange}
                      placeholder={t('register.governoratePlaceholder')}
                      list="governorate-list"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50"
                      autoComplete="off"
                    />
                    <datalist id="governorate-list">
                      {TUNISIA_GEOGRAPHY.map((g) => (
                        <option key={g.governorate} value={g.governorate} />
                      ))}
                    </datalist>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      name="municipality"
                      value={formData.municipality}
                      onChange={handleChange}
                      placeholder={formData.governorate ? t('register.communePlaceholder') : t('register.selectGovernorateFirst')}
                      list="municipality-list"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50"
                      autoComplete="off"
                      disabled={!formData.governorate}
                    />
                    <datalist id="municipality-list">
                      {municipalities.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="animate-slideInLeft delay-400">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('register.phone')} <span className="text-red-500">*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <span style={{
                        padding: '0 12px',
                        height: 42,
                        display: 'flex', alignItems: 'center',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRight: 'none',
                        borderRadius: '8px 0 0 8px',
                        fontSize: 13, color: '#64748b',
                        fontFamily: 'DM Mono, monospace',
                        flexShrink: 0
                      }}>TN</span>
                      <input
                        type="tel"
                        className="w-full px-3 py-2.5 border rounded-r-lg focus:outline-none focus:ring-4 focus:border-primary focus:ring-primary/20 transition-all placeholder:text-slate-400"
                        style={{ borderRadius: '0 8px 8px 0' }}
                        placeholder="2X XXX XXX"
                        maxLength={8}
                        required
                        value={formData.phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                          setFormData({ ...formData, phone: digits });
                          if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
                        }}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="animate-slideInLeft delay-500">
                <Input
                  label={t('register.password')}
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('register.passwordPlaceholder')}
                  icon={<Lock size={18} />}
                  error={fieldErrors.password}
                  required
                />

                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{t('register.passwordStrength')}</span>
                      <span className={`font-medium ${passwordStrength.strength >= 3 ? 'text-success-700' : 'text-attention-700'}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                  label={t('register.confirmPassword')}
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('register.confirmPasswordPlaceholder')}
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
                  {t('register.createBtn')}
                </Button>
              </div>

              {/* Error display at bottom of form */}
              {(error || localError) && (
                <div className="mt-4 animate-slideInLeft">
                  <Alert variant="error" onClose={() => setLocalError("")}>
                    {error || localError}
                  </Alert>
                </div>
              )}
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100 animate-fadeIn delay-500">
              <p className="text-center text-sm text-slate-600">
                {t('register.alreadyHaveAccount')}{" "}
                <Link 
                  href="/" 
                  className="text-primary hover:text-primary-700 font-semibold transition-all duration-200 hover:underline"
                >
                  {t('register.signIn')}
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 mt-4 animate-fadeIn delay-500">
            {t('register.terms')}
          </p>
        </div>
      </div>
    </>
  );
}
