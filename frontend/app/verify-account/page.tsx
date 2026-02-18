"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ShieldCheck, Sparkles, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useAuthStore } from "@/store/useAuthStore";

function VerifyAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const magicToken = searchParams.get("token");
  const magicUserId = searchParams.get("userId");
  const emailFromRegister = searchParams.get("email") || "";

  const { verifyMagicLink } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (magicToken && magicUserId) {
      handleVerifyMagicLink();
    }
  }, [magicToken, magicUserId]);

  const handleVerifyMagicLink = async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/verify-magic-link?token=${magicToken}&userId=${magicUserId}`,
        { method: 'GET' }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "La vérification a échoué.");
        return;
      }

      // Check if user needs to set password (admin-created user)
      if (data.needsPasswordSetup) {
        // Redirect to password setup page
        window.location.href = data.redirectUrl;
        return;
      }

      // Store tokens and redirect to dashboard
      if (data.token && data.refreshToken) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        setIsVerified(true);
        setTimeout(() => {
          router.push("/dashboard?verified=true");
        }, 1500);
      } else {
        // Fallback: redirect to login if no tokens
        setIsVerified(true);
        setTimeout(() => {
          router.push("/?verified=true");
        }, 2000);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "La vérification a échoué. Le lien peut être expiré ou invalide."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Show magic link verification state
  if (magicToken && magicUserId) {
    return (
      <>
        <AnimatedBackground />

        <div className="min-h-screen flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8 animate-fadeIn">
              <Link
                href="/"
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-2xl mb-4 shadow-xl shadow-primary/25 hover-lift transition-all duration-300"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </Link>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Vérification
              </h1>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 animate-scaleIn delay-200">
              {isVerified ? (
                <>
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-100 mb-4">
                      <CheckCircle className="w-8 h-8 text-success-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                      Compte vérifié !
                    </h2>
                    <p className="text-slate-600 mb-6">
                      Redirection vers la page de connexion...
                    </p>
                  </div>
                </>
              ) : errorMessage ? (
                <>
                  <div className="mb-6">
                    <Alert variant="error" onClose={() => setErrorMessage(null)}>
                      {errorMessage}
                    </Alert>
                  </div>
                  <div className="text-center py-4">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary-700 font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Retour à la page de connexion
                    </Link>
                  </div>
                </>
              ) : isVerifying ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-slate-600">Vérification en cours...</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show waiting for email page
  return (
    <>
      <AnimatedBackground />

      <div className="min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 animate-fadeIn">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-2xl mb-4 shadow-xl shadow-primary/25 hover-lift transition-all duration-300"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Vérifiez votre compte
            </h1>
            <p className="text-slate-600">
              Un lien de vérification a été envoyé à votre email.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 animate-scaleIn delay-200">
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-slate-600 mb-4">
                <strong>{emailFromRegister}</strong>
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Ouvrez votre boîte email et cliquez sur le lien de vérification.
                Le lien expire dans 15 minutes.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-500 text-center mb-4">
                Vous n&apos;avez pas reçu d&apos;email ?
              </p>
              <Button
                onClick={() => router.push("/")}
                fullWidth
                variant="outline"
              >
                Retour à la page de connexion
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function VerifyAccountLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600">Chargement...</p>
      </div>
    </div>
  );
}

export default function VerifyAccountPage() {
  return (
    <Suspense fallback={<VerifyAccountLoading />}>
      <VerifyAccountContent />
    </Suspense>
  );
}
