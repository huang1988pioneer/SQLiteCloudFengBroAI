import type { WorkspaceModule, WorkspaceRecord } from "@/types/workspace";

export type RecordFilter = {
  key: string;
  label: string;
  match: (record: WorkspaceRecord) => boolean;
};

export function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function todayInput() {
  return formatDateInput(new Date());
}

/** Whole days from today to a YYYY-MM-DD value; Infinity when empty or unparseable. */
export function daysFromToday(value: unknown) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

const hasText = (value: unknown) => String(value ?? "").trim() !== "";
const hasUrl = (value: unknown) => /(https?:\/\/|www\.)/i.test(String(value ?? ""));

export const allFilter: RecordFilter = { key: "all", label: "全部", match: () => true };

const moduleFilters: Record<string, RecordFilter[]> = {
  food: [
    { key: "expired", label: "已過期", match: (record) => daysFromToday(record.todate) < 0 },
    {
      key: "soon",
      label: "7 天內到期",
      match: (record) => {
        const days = daysFromToday(record.todate);
        return days >= 0 && days <= 7;
      },
    },
    { key: "low", label: "低庫存", match: (record) => Number(record.amount || 0) <= 1 },
    { key: "undated", label: "未設到期日", match: (record) => !hasText(record.todate) },
  ],
  article: [
    { key: "pinned", label: "已釘選", match: (record) => Number(record.pinned || 0) === 1 },
    { key: "links", label: "有連結", match: (record) => [record.url1, record.url2, record.url3].some(hasText) },
    { key: "files", label: "有附件", match: (record) => [record.file1, record.file2, record.file3].some(hasText) },
    { key: "no-summary", label: "未摘要", match: (record) => hasText(record.content) && !hasText(record.ai_summary) },
  ],
  bank: [
    { key: "balance", label: "有餘額", match: (record) => Number(record.deposit || 0) > 0 },
    { key: "zero", label: "零餘額", match: (record) => Number(record.deposit || 0) === 0 },
    { key: "activity", label: "有活動", match: (record) => hasText(record.activity) },
    { key: "incomplete", label: "待補帳號", match: (record) => !hasText(record.account) },
  ],
  routine: [
    {
      key: "stale",
      label: "超過 30 天未做",
      match: (record) => {
        const days = daysFromToday(record.lastdate1);
        return Number.isFinite(days) && days < -30;
      },
    },
    { key: "undated", label: "尚無日期", match: (record) => !hasText(record.lastdate1) },
    { key: "links", label: "有連結", match: (record) => hasUrl(record.name) },
    { key: "photo", label: "有照片", match: (record) => hasText(record.photo) },
  ],
};

export function getModuleFilters(moduleKey: string) {
  return [allFilter, ...(moduleFilters[moduleKey] || [])];
}

export function matchesRecordQuery(record: WorkspaceRecord, module: WorkspaceModule, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return module.fields
    .map((field) => String(record[field.name] ?? ""))
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}
