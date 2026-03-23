import React from "react";

type HistoryItem = {
  action?: string;
  status?: string;
  actorName?: string;
  changedBy?: { fullName?: string };
  actorRole?: string;
  note?: string;
  comment?: string;
  timestamp?: string;
  date?: string;
};

interface TimelineProps {
  history: HistoryItem[];
  userRole?: string;
}

const getActionColor = (action: string) => {
  switch (action) {
    case "SUBMITTED":
    case "submitted":
      return "var(--accent)";
    case "VALIDATED":
    case "validated":
      return "var(--green3)";
    case "REJECTED":
    case "rejected":
      return "var(--red)";
    case "ASSIGNED":
    case "assigned":
      return "var(--purple)";
    case "STARTED":
    case "IN_PROGRESS":
    case "started":
    case "in_progress":
      return "var(--orange)";
    case "RESOLVED":
    case "resolved":
      return "var(--teal)";
    case "CLOSED":
    case "closed":
      return "var(--green)";
    default:
      return "var(--txt3)";
  }
};

const getActionLabel = (action: string) => {
  const map: Record<string, string> = {
    SUBMITTED: "Submitted",
    submitted: "Submitted",
    VALIDATED: "Validated",
    validated: "Validated",
    REJECTED: "Rejected",
    rejected: "Rejected",
    ASSIGNED: "Assigned",
    assigned: "Assigned",
    STARTED: "Started",
    started: "Started",
    IN_PROGRESS: "In Progress",
    in_progress: "In Progress",
    RESOLVED: "Resolved",
    resolved: "Resolved",
    CLOSED: "Closed",
    closed: "Closed",
  };
  return map[action] || action;
};

const formatDate = (ts?: string) => {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString();
};

const Timeline: React.FC<TimelineProps> = ({ history, userRole }) => {
  if (!history || history.length === 0) return null;

  // Normalize history items to handle both backend formats
  let normalizedHistory = history.map((h) => ({
    action: h.action || h.status || "",
    actorName: h.actorName || h.changedBy?.fullName || "System",
    actorRole: h.actorRole || "",
    note: h.note || h.comment || "",
    timestamp: h.timestamp || h.date || "",
  })).filter(h => h.action);

  // Filter based on user role for citizens
  if (userRole === "CITIZEN") {
    // Citizens only see status changes and public notes
    normalizedHistory = normalizedHistory.filter(h => {
      // Show status changes
      const isStatusChange = ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"].includes(h.action);
      // Show public notes (notes that are not internal types)
      const isPublicNote = h.note && !h.note.includes("[INTERNAL]") && !h.note.includes("[BLOCAGE]");
      return isStatusChange || isPublicNote;
    });
    
    // Replace actor names with generic labels for citizens
    normalizedHistory = normalizedHistory.map(h => ({
      ...h,
      actorName: h.actorName === "System" ? "System" : "Municipal Agent",
      actorRole: "",
    }));
  }

  if (normalizedHistory.length === 0) return null;

  return (
    <div style={{ position: "relative", paddingLeft: 24 }}>
      <div
        style={{
          position: "absolute",
          left: 7,
          top: 8,
          bottom: 8,
          width: 2,
          background: "var(--bdr2)",
        }}
      />
      {normalizedHistory.map((h, i) => (
        <div
          key={i}
          style={{
            position: "relative",
            marginBottom: 16,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -17,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: getActionColor(h.action),
              border: "2px solid var(--bg)",
              zIndex: 1,
              flexShrink: 0,
            }}
          />
          <div className="card" style={{ flex: 1, padding: "10px 14px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: getActionColor(h.action),
                }}
              >
                {getActionLabel(h.action)}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--txt3)",
                  fontFamily: "DM Mono,monospace",
                }}
              >
                {formatDate(h.timestamp)}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--txt2)" }}>
              {userRole !== "CITIZEN" && (
                <>
                  By <strong>{h.actorName}</strong>
                  {h.actorRole && (
                    <span
                      className="badge"
                      style={{
                        marginLeft: 6,
                        fontSize: 9,
                        background: "var(--bg3)",
                        color: "var(--txt3)",
                      }}
                    >
                      {h.actorRole}
                    </span>
                  )}
                </>
              )}
              {userRole === "CITIZEN" && h.actorName !== "System" && (
                <span style={{ color: "var(--txt3)" }}>Municipal Agent</span>
              )}
            </div>
            {h.note && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--txt3)",
                  fontStyle: "italic",
                  padding: "6px 8px",
                  background: "var(--bg3)",
                  borderRadius: "var(--rsm)",
                }}
              >
                &quot;{h.note}&quot;
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;

