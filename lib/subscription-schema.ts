import type { SubscriptionSchemaField } from "@/types/subscription";

export const subscriptionSchema: SubscriptionSchemaField[] = [
  { name: "id", type: "TEXT PRIMARY KEY", required: true, defaultValue: "crypto.randomUUID()", note: "前端或 API 產生的唯一 ID" },
  { name: "name", type: "TEXT", required: true, defaultValue: "-", note: "服務名稱，例如 ChatGPT、Netflix" },
  { name: "site", type: "TEXT", required: false, defaultValue: "NULL", note: "服務網址" },
  { name: "price", type: "REAL", required: true, defaultValue: "0", note: "原幣金額" },
  { name: "currency", type: "TEXT", required: true, defaultValue: "TWD", note: "ISO 幣別，例如 TWD、USD、JPY" },
  { name: "nextdate", type: "TEXT", required: false, defaultValue: "NULL", note: "下次扣款日，格式 YYYY-MM-DD" },
  { name: "account", type: "TEXT", required: false, defaultValue: "NULL", note: "登入帳號或 Email" },
  { name: "note", type: "TEXT", required: false, defaultValue: "NULL", note: "付款方式、方案、備註" },
  { name: "continue", type: "INTEGER", required: true, defaultValue: "1", note: "1 續訂，0 停止續訂" },
  { name: "created_at", type: "TEXT", required: true, defaultValue: "CURRENT_TIMESTAMP", note: "建立時間" },
  { name: "updated_at", type: "TEXT", required: true, defaultValue: "CURRENT_TIMESTAMP", note: "更新時間" },
];

export const subscriptionCreateTableSql = `CREATE TABLE IF NOT EXISTS subscription (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  site TEXT,
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TWD',
  nextdate TEXT,
  account TEXT,
  note TEXT,
  continue INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_nextdate ON subscription(nextdate);
CREATE INDEX IF NOT EXISTS idx_subscription_continue ON subscription(continue);`;
