"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";

type NoteType = "NOTE" | "BLOCAGE" | "PUBLIC";

type NoteItem = {
  _id: string;
  type: NoteType;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
};

interface InternalNotesProps {
  notes: NoteItem[];
  userRole: string;
  canAdd: boolean;
  onAdd: (type: NoteType, content: string) => void;
}

const InternalNotes: React.FC<InternalNotesProps> = ({ notes, userRole, canAdd, onAdd }) => {
  const [noteText, setNoteText] = useState("");
  const { t } = useTranslation();

  const add = (type: NoteType) => {
    if (!noteText.trim()) return;
    onAdd(type, noteText.trim());
    setNoteText("");
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const isStaff = !["CITIZEN", undefined, null].includes(userRole) && userRole !== "";

  if (!isStaff && notes.filter(n => n.type === "PUBLIC").length === 0) {
    return null;
  }

  const getNoteStyle = (type: NoteType) => {
    if (type === "BLOCAGE") {
      return {
        background: "bg-orange-50",
        borderColor: "border-orange-200",
        leftBorderColor: "border-l-orange-500",
        badgeBg: "bg-orange-500",
        badgeColor: "text-white",
        label: t("notes.blocker")
      };
    }
    if (type === "PUBLIC") {
      return {
        background: "bg-blue-50",
        borderColor: "border-blue-200",
        leftBorderColor: "border-l-blue-500",
        badgeBg: "bg-blue-500",
        badgeColor: "text-white",
        label: t("notes.sentToCitizen")
      };
    }
    return {
      background: "bg-slate-50",
      borderColor: "border-slate-200",
      leftBorderColor: "border-l-slate-400",
      badgeBg: "bg-slate-400",
      badgeColor: "text-white",
      label: t("notes.internalNote")
    };
  };

  const visibleNotes = userRole === "CITIZEN"
    ? notes.filter(n => n.type === "PUBLIC")
    : notes;

  return (
    <div className="space-y-3">
      {visibleNotes.map((note, index) => {
        const style = getNoteStyle(note.type);
        const noteKey = note._id || `note-${index}-${note.createdAt}`;
        return (
          <div
            key={noteKey}
            className={`p-3 rounded-lg border ${style.background} ${style.borderColor} border-l-4 ${style.leftBorderColor}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${style.badgeBg} ${style.badgeColor}`}
                >
                  {style.label}
                </span>
                <span className="text-xs font-medium text-slate-700">{note.authorName}</span>
                <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {note.authorRole}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {formatDate(note.createdAt)}
              </span>
            </div>
            <p className="text-sm text-slate-700">{note.content}</p>
          </div>
        );
      })}

      {canAdd && isStaff && (
        <div className="mt-4 space-y-3">
          <textarea
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            placeholder={t("notes.placeholder")}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-slate-500">
            {t("notes.helperText")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => add("NOTE")}
              disabled={!noteText.trim()}
              className="px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t("notes.addNote")}
            </button>
            <button
              onClick={() => add("PUBLIC")}
              disabled={!noteText.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t("notes.sendToCitizen")}
            </button>
            {["TECHNICIAN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "ADMIN"].includes(userRole) && (
              <button
                onClick={() => add("BLOCAGE")}
                disabled={!noteText.trim()}
                className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t("notes.reportBlocker")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalNotes;
