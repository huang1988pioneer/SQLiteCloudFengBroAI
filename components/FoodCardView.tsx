"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calendar, DollarSign, ImageOff, Package, Pencil, ShoppingBag, Trash2 } from "lucide-react";
import type { WorkspaceRecord } from "@/types/workspace";

type Props = {
  records: WorkspaceRecord[];
  loading: boolean;
  onEdit: (record: WorkspaceRecord) => void;
  onDelete: (record: WorkspaceRecord) => void;
};

function daysUntilExpiry(dateValue: string) {
  if (!dateValue) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

function expiryLabel(days: number) {
  if (days === Number.POSITIVE_INFINITY) return "";
  if (days < 0) return `已過期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天到期";
  return `${days} 天後到期`;
}

function expiryClass(days: number) {
  if (days === Number.POSITIVE_INFINITY) return "";
  if (days < 0) return "food-expired";
  if (days <= 7) return "food-expiring-soon";
  return "food-ok";
}

function formatPrice(price: number) {
  if (!price) return "";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function FoodCardView({ records, loading, onEdit, onDelete }: Props) {
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const daysA = daysUntilExpiry(String(a.todate || ""));
      const daysB = daysUntilExpiry(String(b.todate || ""));
      return daysA - daysB;
    });
  }, [records]);

  const handleImgError = (id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  };

  if (records.length === 0) {
    return (
      <div className="food-empty">
        <Package size={40} />
        <p>尚無食品資料，請新增一筆或匯入 CSV。</p>
      </div>
    );
  }

  return (
    <div className="food-card-grid">
      {sortedRecords.map((record) => {
        const name = String(record.name || "無名稱");
        const photo = String(record.photo || "").trim();
        const amount = Number(record.amount || 0);
        const price = Number(record.price || 0);
        const shop = String(record.shop || "").trim();
        const todate = String(record.todate || "").trim();
        const days = daysUntilExpiry(todate);
        const statusLabel = expiryLabel(days);
        const statusClass = expiryClass(days);
        const hasPhoto = photo && !imgErrors.has(record.id);

        return (
          <article key={record.id} className={`food-card ${statusClass}`}>
            {/* Photo area */}
            <div className="food-card-photo">
              {hasPhoto ? (
                <img
                  src={photo}
                  alt={name}
                  loading="lazy"
                  onError={() => handleImgError(record.id)}
                />
              ) : (
                <div className="food-card-no-photo">
                  <ImageOff size={32} />
                </div>
              )}
              {statusLabel ? (
                <span className={`food-expiry-badge ${statusClass}`}>
                  {days < 0 ? <AlertTriangle size={12} /> : <Calendar size={12} />}
                  {statusLabel}
                </span>
              ) : null}
            </div>

            {/* Info */}
            <div className="food-card-info">
              <h3 className="food-card-name">{name}</h3>

              <div className="food-card-meta">
                {todate ? (
                  <div className="food-meta-item">
                    <Calendar size={13} />
                    <span>到期 {todate}</span>
                  </div>
                ) : null}
                {amount ? (
                  <div className="food-meta-item">
                    <Package size={13} />
                    <span>數量 {amount}</span>
                  </div>
                ) : null}
                {price ? (
                  <div className="food-meta-item">
                    <DollarSign size={13} />
                    <span>{formatPrice(price)}</span>
                  </div>
                ) : null}
                {shop ? (
                  <div className="food-meta-item">
                    <ShoppingBag size={13} />
                    <span>{shop}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Actions */}
            <div className="food-card-actions">
              <button
                type="button"
                className="food-action-button"
                title="編輯"
                onClick={() => onEdit(record)}
              >
                <Pencil size={14} />
                <span>編輯</span>
              </button>
              <button
                type="button"
                className="food-action-button food-action-delete"
                title="刪除"
                onClick={() => onDelete(record)}
                disabled={loading}
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
