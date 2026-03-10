"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  rightContent?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, showBackButton = true, backHref, rightContent, className = "" }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header className={`bg-gradient-to-r from-primary to-primary-700 text-white shadow-lg relative overflow-hidden ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md transition-colors text-sm font-medium"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-white/70">{subtitle}</p>
            )}
          </div>
          {rightContent && (
            <div className="flex items-center gap-2">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
