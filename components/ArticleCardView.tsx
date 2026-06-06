"use client";

import { useState } from "react";
import { Calendar, FileText, Pencil, Pin, PinOff, Sparkles, Trash2 } from "lucide-react";
import type { WorkspaceRecord } from "@/types/workspace";

type Props = {
  records: WorkspaceRecord[];
  loading: boolean;
  onEdit: (record: WorkspaceRecord) => void;
  onDelete: (record: WorkspaceRecord) => void;
  onTogglePin: (record: WorkspaceRecord) => void;
  onGenerateSummary: (record: WorkspaceRecord) => void;
};

function truncate(text: string, maxLength = 120) {
  if (text.length <= maxLength) return { text, truncated: false };
  return { text: text.slice(0, maxLength) + "…", truncated: true };
}

export function ArticleCardView({ records, loading, onEdit, onDelete, onTogglePin, onGenerateSummary }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sortedRecords = [...records].sort((a, b) => {
    const pinnedA = Number(a.pinned || 0);
    const pinnedB = Number(b.pinned || 0);
    if (pinnedA !== pinnedB) return pinnedB - pinnedA;
    const dateA = String(a.newDate || "");
    const dateB = String(b.newDate || "");
    return dateB.localeCompare(dateA);
  });

  if (records.length === 0) {
    return (
      <div className="article-empty">
        <FileText size={40} />
        <p>尚無筆記，請新增一筆或匯入 CSV。</p>
      </div>
    );
  }

  return (
    <div className="article-card-grid">
      {sortedRecords.map((record) => {
        const title = String(record.title || "無標題");
        const content = String(record.content || "");
        const aiSummary = String(record.ai_summary || "");
        const date = String(record.newDate || "");
        const isPinned = Number(record.pinned || 0) === 1;
        const isExpanded = expandedIds.has(record.id);
        const contentPreview = truncate(content, 160);

        return (
          <article
            key={record.id}
            className={`article-card${isPinned ? " article-card-pinned" : ""}`}
          >
            <div className="article-card-header">
              <div className="article-card-title-row">
                {isPinned ? <Pin size={15} className="article-pin-icon" /> : null}
                <FileText size={16} className="article-file-icon" />
                <h3 className="article-card-title">{title}</h3>
              </div>
              {date ? (
                <div className="article-card-date">
                  <Calendar size={13} />
                  <span>{date}</span>
                </div>
              ) : null}
            </div>

            {aiSummary ? (
              <div className="article-ai-summary">
                <div className="article-ai-summary-label">
                  <Sparkles size={14} />
                  <span>AI 摘要</span>
                </div>
                <p>{aiSummary}</p>
              </div>
            ) : null}

            {content ? (
              <div className="article-card-content">
                <p>{isExpanded ? content : contentPreview.text}</p>
                {contentPreview.truncated ? (
                  <button
                    type="button"
                    className="article-expand-button"
                    onClick={() => toggleExpand(record.id)}
                  >
                    {isExpanded ? "收合" : "展示全文"}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="article-card-actions">
              <button
                type="button"
                className={`article-action-button${isPinned ? " article-action-active" : ""}`}
                onClick={() => onTogglePin(record)}
                disabled={loading}
                title={isPinned ? "取消釘選" : "釘選"}
              >
                {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                <span>釘選</span>
              </button>
              <button
                type="button"
                className="article-action-button"
                onClick={() => onEdit(record)}
                title="編輯"
              >
                <Pencil size={14} />
                <span>編輯</span>
              </button>
              <button
                type="button"
                className="article-action-button article-action-ai"
                onClick={() => onGenerateSummary(record)}
                disabled={loading}
                title="AI 摘要"
              >
                <Sparkles size={14} />
                <span>AI 摘要</span>
              </button>
              <button
                type="button"
                className="article-action-button article-action-delete"
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
  );
}
