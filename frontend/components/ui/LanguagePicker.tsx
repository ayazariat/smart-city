"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LANGS = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇹🇳" },
] as const;

export default function LanguagePicker() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const current = LANGS.find((l) => l.code === i18n.language) || LANGS[0];

  useEffect(() => {
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const change = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors text-sm"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4 text-slate-500" />
        <span className="hidden sm:inline text-xs font-medium text-slate-600">
          {current.flag}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[140px]">
            {LANGS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => change(lang.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  lang.code === i18n.language
                    ? "text-primary font-semibold bg-primary/5"
                    : "text-slate-700"
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
