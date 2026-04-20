"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Menu, Bell } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  onBackClick?: () => void;
  rightContent?: ReactNode;
  className?: string;
  variant?: "default" | "hero" | "minimal";
}

export function PageHeader({
  title,
  subtitle,
  showBackButton = true,
  backHref,
  onBackClick,
  rightContent,
  className = "",
  variant = "default"
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  const variants = {
    default: "bg-white text-slate-800 border-b border-slate-200 shadow-sm",
    hero: "gradient-hero text-white shadow-2xl relative overflow-hidden",
    minimal: "bg-white text-slate-800 border-b border-slate-200 shadow-sm"
  };

  return (
    <header className={`relative ${variants[variant]} ${className}`}>
      {/* Decorative animated background for hero variant */}
      {variant === "hero" && (
        <>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-primary-400/20 rounded-full blur-3xl animate-float delay-300" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-300/10 rounded-full blur-3xl animate-pulse-soft" />
          </div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUvNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 relative z-10">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Back Button */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-xl
                  transition-all duration-300 hover:scale-110 active:scale-95
                  ${variant === "hero" 
                    ? "bg-white/20 hover:bg-white/30 text-white" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }
                `}
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Title Section */}
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight animate-fadeIn">
                {title}
              </h1>
              {subtitle && (
                <p className={`text-sm mt-0.5 animate-fadeIn delay-100 ${
                  variant === "hero" ? "text-white/70" : "text-slate-500"
                }`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Section */}
          {rightContent && (
            <div className="flex items-center gap-2 sm:gap-3 animate-fadeInLeft">
              {rightContent}
            </div>
          )}
        </div>
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </header>
  );
}
