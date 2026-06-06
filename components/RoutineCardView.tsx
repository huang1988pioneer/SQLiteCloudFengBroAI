"use client";

import { CalendarDays, ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { WorkspaceRecord } from "@/types/workspace";

type Props = {
  records: WorkspaceRecord[];
  loading: boolean;
  onEdit: (record: WorkspaceRecord) => void;
  onDelete: (record: WorkspaceRecord) => void;
};

/** Palette for card accent colors – cycles through records. */
const accentColors = [
  { border: "#0891b2", bg: "#ecfeff", text: "#0e7490" },
  { border: "#7c3aed", bg: "#f5f3ff", text: "#6d28d9" },
  { border: "#059669", bg: "#f0fdf4", text: "#047857" },
  { border: "#d97706", bg: "#fffbeb", text: "#b45309" },
  { border: "#2563eb", bg: "#eff6ff", text: "#1d4ed8" },
  { border: "#dc2626", bg: "#fef2f2", text: "#b91c1c" },
];

/** Extract URL from name field – supports bare URLs or https?:// prefixed. */
function extractNameParts(name: string): { label: string; url: string | null } {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
  const match = name.match(urlRegex);
  if (match) {
    const url = match[1];
    const label = name.replace(url, "").trim().replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, "").trim() || url;
    const href = url.startsWith("http") ? url : `https://${url}`;
    return { label: label || href, url: href };
  }
  return { label: name, url: null };
}

function siteLabel(href: string) {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function formatDate(value: unknown) {
  if (!value || String(value).trim() === "") return null;
  return String(value);
}

export function RoutineCardView({ records, loading, onEdit, onDelete }: Props) {
  if (records.length === 0) {
    return (
      <div className="bank-empty">
        <CalendarDays size={40} />
        <p>尚無例行事項，請新增一筆或匯入 CSV。</p>
      </div>
    );
  }

  return (
    <div className="bank-view">
      {/* Summary bar */}
      <div className="bank-summary-bar">
        <div className="bank-summary-item">
          <span>項目數</span>
          <strong>{records.length}</strong>
        </div>
      </div>

      {/* Card grid */}
      <div className="bank-card-grid">
        {records.map((record, index) => {
          const rawName = String(record.name || "無名稱");
          const { label: nameLabel, url: nameUrl } = extractNameParts(rawName);
          const note = String(record.note || "").trim();
          const lastdate1 = formatDate(record.lastdate1);
          const lastdate2 = formatDate(record.lastdate2);
          const lastdate3 = formatDate(record.lastdate3);
          const photo = String(record.photo || "").trim();
          const accent = accentColors[index % accentColors.length];

          return (
            <article
              key={record.id}
              className="bank-card"
              style={{ borderTopColor: accent.border }}
            >
              {/* Header: name as link if URL embedded */}
              <div className="bank-card-header">
                <div className="bank-card-icon" style={{ background: accent.bg, color: accent.text }}>
                  <CalendarDays size={20} />
                </div>
                <div className="bank-card-title-area">
                  {nameUrl ? (
                    <a
                      href={nameUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bank-card-name-link"
                      style={{ color: accent.text }}
                    >
                      {nameLabel}
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <h3 className="bank-card-name">{nameLabel}</h3>
                  )}
                  {nameUrl ? (
                    <span className="bank-card-domain">{siteLabel(nameUrl)}</span>
                  ) : null}
                </div>
              </div>

              {/* Dates */}
              {(lastdate1 || lastdate2 || lastdate3) ? (
                <div className="bank-card-details">
                  {lastdate1 ? (
                    <div className="bank-detail-item">
                      <CalendarDays size={13} />
                      <span>日期 1：{lastdate1}</span>
                    </div>
                  ) : null}
                  {lastdate2 ? (
                    <div className="bank-detail-item">
                      <CalendarDays size={13} />
                      <span>日期 2：{lastdate2}</span>
                    </div>
                  ) : null}
                  {lastdate3 ? (
                    <div className="bank-detail-item">
                      <CalendarDays size={13} />
                      <span>日期 3：{lastdate3}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Note */}
              {note ? (
                <div className="bank-card-details">
                  <div className="bank-detail-item">
                    <span style={{ whiteSpace: "pre-wrap", fontSize: "0.82rem", color: "#64748b" }}>{note}</span>
                  </div>
                </div>
              ) : null}

              {/* Photo */}
              {photo ? (
                <div className="bank-card-details">
                  <div className="bank-detail-item">
                    <a href={photo} target="_blank" rel="noreferrer" className="bank-activity-link">
                      照片
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="bank-card-actions">
                <button
                  type="button"
                  className="bank-action-button"
                  onClick={() => onEdit(record)}
                  title="編輯"
                >
                  <Pencil size={14} />
                  <span>編輯</span>
                </button>
                <button
                  type="button"
                  className="bank-action-button bank-action-delete"
                  onClick={() => onDelete(record)}
                  disabled={loading}
                  title="刪除"
                >
                  <Trash2 size={14} />
                  <span>刪除</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
