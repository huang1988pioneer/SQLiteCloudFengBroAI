"use client";

import { useState } from "react";
import { Clipboard, ExternalLink, FileText, Globe, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { WorkspaceRecord } from "@/types/workspace";

type SiteEntry = {
  index: number;
  site: string;
  note: string;
};

type Props = {
  records: WorkspaceRecord[];
  loading: boolean;
  onEdit: (record: WorkspaceRecord) => void;
  onDelete: (record: WorkspaceRecord) => void;
  flash: (message: string) => void;
};

/** Alternate top-border colors for visual grouping, matching the reference design. */
const borderColors = ["#ea580c", "#2563eb", "#0891b2", "#7c3aed", "#059669", "#d97706"];

function extractSites(record: WorkspaceRecord): SiteEntry[] {
  const entries: SiteEntry[] = [];
  for (let i = 1; i <= 37; i++) {
    const key = String(i).padStart(2, "0");
    const site = String(record[`site${key}`] || "").trim();
    const note = String(record[`note${key}`] || "").trim();
    if (site || note) {
      entries.push({ index: i, site, note });
    }
  }
  return entries;
}

function siteLabel(site: string) {
  try {
    const url = new URL(site.startsWith("http") ? site : `https://${site}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return site;
  }
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(value);
}

function siteHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function CommonAccountCardView({ records, loading, onEdit, onDelete, flash }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash("已複製到剪貼簿");
    } catch {
      flash("複製失敗");
    }
  };

  if (records.length === 0) {
    return (
      <div className="common-empty">
        <FileText size={40} />
        <p>尚無常用帳號，請新增一筆或匯入 CSV。</p>
      </div>
    );
  }

  return (
    <div className="common-card-list">
      {records.map((record, recordIndex) => {
        const name = String(record.name || "無名稱");
        const sites = extractSites(record);
        const isExpanded = expandedIds.has(record.id);
        const visibleSites = isExpanded ? sites : sites.slice(0, 4);
        const color = borderColors[recordIndex % borderColors.length];

        return (
          <article
            key={record.id}
            className="common-card"
            style={{ borderTopColor: color }}
          >
            {/* Card header */}
            <div className="common-card-header">
              <div className="common-card-name-row">
                <FileText size={16} className="common-name-icon" />
                <h3 className="common-card-name">{name}</h3>
              </div>
              <div className="common-card-header-actions">
                <button
                  type="button"
                  className="common-icon-button"
                  title="複製名稱"
                  onClick={() => void copyToClipboard(name)}
                >
                  <Clipboard size={14} />
                </button>
                <button
                  type="button"
                  className="common-icon-button"
                  title="編輯"
                  onClick={() => onEdit(record)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="common-icon-button common-icon-delete"
                  title="刪除"
                  onClick={() => onDelete(record)}
                  disabled={loading}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Site entries */}
            {visibleSites.length > 0 ? (
              <div className="common-site-list">
                {visibleSites.map((entry) => (
                  <div key={entry.index} className="common-site-entry">
                    {entry.note ? (
                      <div className="common-site-note">
                        <div className="common-site-note-label">
                          <Sparkles size={12} />
                          <span>AI 摘要</span>
                        </div>
                        <p>{entry.note}</p>
                      </div>
                    ) : null}
                    <div className="common-site-link-row">
                      <Globe size={15} className="common-site-globe" />
                      {isUrl(entry.site) ? (
                        <a
                          href={siteHref(entry.site)}
                          target="_blank"
                          rel="noreferrer"
                          className="common-site-link"
                        >
                          {siteLabel(entry.site)}
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="common-site-text">{entry.site || entry.note}</span>
                      )}
                      <div className="common-site-actions">
                        <button
                          type="button"
                          className="common-site-action-button"
                          title="複製"
                          onClick={() => void copyToClipboard(entry.site || entry.note)}
                        >
                          <Clipboard size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="common-site-empty">尚無常用網站</div>
            )}

            {/* Expand / collapse */}
            {sites.length > 4 ? (
              <button
                type="button"
                className="common-expand-button"
                onClick={() => toggleExpand(record.id)}
              >
                {isExpanded ? "收合" : `展開全部 ${sites.length} 項`}
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
