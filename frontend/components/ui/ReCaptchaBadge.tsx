import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, action: { action: string }) => Promise<string>;
      ready: (callback: () => void) => void;
    };
    refreshRecaptchaToken?: () => Promise<string | null>;
  }
}

interface ReCaptchaBadgeProps {
  action: "register" | "login";
  onTokenChange?: (token: string | null) => void;
}

/**
 * Lightweight integration for Google reCAPTCHA v3.
 * - Uses NEXT_PUBLIC_RECAPTCHA_SITE_KEY (frontend-only)
 * - Automatically executes for a given action and returns a token
 * - Backend must validate this token with Google API
 */
export const ReCaptchaBadge: React.FC<ReCaptchaBadgeProps> = ({
  action,
  onTokenChange,
}) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const executeRecaptcha = async (): Promise<string | null> => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey || !window.grecaptcha) {
      return null;
    }

    try {
      setLoading(true);
      const token = await window.grecaptcha.execute(siteKey, { action });
      onTokenChange?.(token);
      setReady(true);
      setError(null);
      return token;
    } catch (err) {
      console.error("reCAPTCHA execution failed", err);
      setError("reCAPTCHA failed");
      onTokenChange?.(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initRecaptcha = () => {
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (!siteKey) {
        setError("reCAPTCHA not configured");
        return;
      }

      if (window.grecaptcha) {
        setReady(true);
        return;
      }

      // Load script
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        window.grecaptcha?.ready(() => {
          setReady(true);
        });
      };

      script.onerror = () => {
        setError("Failed to load reCAPTCHA");
      };

      document.head.appendChild(script);
    };

    initRecaptcha();
  }, [action]);

  // Expose a method to refresh the token
  useEffect(() => {
    window.refreshRecaptchaToken = async () => {
      return await executeRecaptcha();
    };

    return () => {
      window.refreshRecaptchaToken = undefined;
    };
  }, [action]);

  return (
    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
      <div className="flex items-center gap-1">
        <span
          className={`inline-flex h-2 w-2 rounded-full ${
            error ? "bg-urgent-400" : ready ? "bg-success-400" : "bg-slate-300"
          }`}
        />
        <span>
          Protected by{" "}
          <span className="font-semibold text-slate-500">reCAPTCHA v3</span>
        </span>
        {loading && <span className="text-attention-500">(refreshing...)</span>}
      </div>
      <div className="flex gap-2">
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noreferrer"
          className="hover:text-slate-600 underline-offset-2 hover:underline"
        >
          Privacy
        </a>
        <a
          href="https://policies.google.com/terms"
          target="_blank"
          rel="noreferrer"
          className="hover:text-slate-600 underline-offset-2 hover:underline"
        >
          Terms
        </a>
      </div>
    </div>
  );
};

// Export a helper function to get fresh token
export const refreshRecaptchaToken = async (): Promise<string | null> => {
  if (typeof window !== "undefined" && window.refreshRecaptchaToken) {
    return await window.refreshRecaptchaToken();
  }
  return null;
};
