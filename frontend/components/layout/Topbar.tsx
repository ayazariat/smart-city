"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

const BackButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;
  return (
    <button
      onClick={() => router.back()}
      className="btn secondary sm icon-only"
      style={{ marginRight: 8 }}
      title="Retour"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
};

interface TopbarProps {
  title: string;
  rightContent?: React.ReactNode;
}

const Topbar: React.FC<TopbarProps> = ({ title, rightContent }) => {
  return (
    <div className="topbar">
      <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BackButton />
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">{rightContent}</div>
    </div>
  );
};

export default Topbar;

