"use client";

import { Building2, CreditCard, ExternalLink, Hash, Landmark, Pencil, Trash2, User, Wallet } from "lucide-react";
import type { WorkspaceRecord } from "@/types/workspace";

type Props = {
  records: WorkspaceRecord[];
  loading: boolean;
  onEdit: (record: WorkspaceRecord) => void;
  onDelete: (record: WorkspaceRecord) => void;
};

/** Palette for card accent colors – cycles through records. */
const accentColors = [
  { border: "#2563eb", bg: "#eff6ff", text: "#1d4ed8" },
  { border: "#0891b2", bg: "#ecfeff", text: "#0e7490" },
  { border: "#7c3aed", bg: "#f5f3ff", text: "#6d28d9" },
  { border: "#059669", bg: "#f0fdf4", text: "#047857" },
  { border: "#d97706", bg: "#fffbeb", text: "#b45309" },
  { border: "#dc2626", bg: "#fef2f2", text: "#b91c1c" },
];

function formatDeposit(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}

function siteHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function siteLabel(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export function BankCardView({ records, loading, onEdit, onDelete }: Props) {
  if (records.length === 0) {
    return (
      <div className="bank-empty">
        <Landmark size={40} />
        <p>尚無銀行資料，請新增一筆或匯入 CSV。</p>
      </div>
    );
  }

  /* Compute totals for the summary bar */
  const totalDeposit = records.reduce((sum, r) => sum + Number(r.deposit || 0), 0);

  return (
    <div className="bank-view">
      {/* Summary bar */}
      <div className="bank-summary-bar">
        <div className="bank-summary-item">
          <span>帳戶數</span>
          <strong>{records.length}</strong>
        </div>
        <div className="bank-summary-item">
          <span>合計餘額</span>
          <strong>{formatDeposit(totalDeposit)}</strong>
        </div>
      </div>

      {/* Card grid */}
      <div className="bank-card-grid">
        {records.map((record, index) => {
          const name = String(record.name || "無名稱");
          const site = String(record.site || "").trim();
          const deposit = Number(record.deposit || 0);
          const card = String(record.card || "").trim();
          const account = String(record.account || "").trim();
          const address = String(record.address || "").trim();
          const withdrawals = Number(record.withdrawals || 0);
          const transfer = Number(record.transfer || 0);
          const activity = String(record.activity || "").trim();
          const accent = accentColors[index % accentColors.length];

          return (
            <article
              key={record.id}
              className="bank-card"
              style={{ borderTopColor: accent.border }}
            >
              {/* Header: name as link if site exists */}
              <div className="bank-card-header">
                <div className="bank-card-icon" style={{ background: accent.bg, color: accent.text }}>
                  <Building2 size={20} />
                </div>
                <div className="bank-card-title-area">
                  {site ? (
                    <a
                      href={siteHref(site)}
                      target="_blank"
                      rel="noreferrer"
                      className="bank-card-name-link"
                      style={{ color: accent.text }}
                    >
                      {name}
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <h3 className="bank-card-name">{name}</h3>
                  )}
                  {site ? (
                    <span className="bank-card-domain">{siteLabel(site)}</span>
                  ) : null}
                </div>
              </div>

              {/* Deposit highlight */}
              {deposit ? (
                <div className="bank-card-deposit" style={{ background: accent.bg, borderColor: accent.border }}>
                  <Wallet size={16} style={{ color: accent.text }} />
                  <span style={{ color: accent.text }}>{formatDeposit(deposit)}</span>
                </div>
              ) : null}

              {/* Details */}
              <div className="bank-card-details">
                {card ? (
                  <div className="bank-detail-item">
                    <CreditCard size={13} />
                    <span>{card}</span>
                  </div>
                ) : null}
                {account ? (
                  <div className="bank-detail-item">
                    <User size={13} />
                    <span>{account}</span>
                  </div>
                ) : null}
                {address ? (
                  <div className="bank-detail-item">
                    <Building2 size={13} />
                    <span>{address}</span>
                  </div>
                ) : null}
                {(withdrawals || transfer) ? (
                  <div className="bank-detail-item">
                    <Hash size={13} />
                    <span>
                      {withdrawals ? `提款 ${withdrawals} 次` : ""}
                      {withdrawals && transfer ? " · " : ""}
                      {transfer ? `轉帳 ${transfer} 次` : ""}
                    </span>
                  </div>
                ) : null}
                {activity ? (
                  <div className="bank-detail-item">
                    <a
                      href={siteHref(activity)}
                      target="_blank"
                      rel="noreferrer"
                      className="bank-activity-link"
                    >
                      活動優惠
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : null}
              </div>

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
