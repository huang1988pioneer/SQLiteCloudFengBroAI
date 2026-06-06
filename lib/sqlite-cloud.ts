import { subscriptionCreateTableSql } from "@/lib/subscription-schema";
import type { Subscription, SubscriptionDraft } from "@/types/subscription";

type SQLiteCloudDb = {
  sql: (query: string) => Promise<unknown>;
};

export function getConnectionString(headers: Headers) {
  return (
    headers.get("x-sqlitecloud-connection") ||
    process.env.SQLITECLOUD_CONNECTION_STRING ||
    process.env.SQLITE_CLOUD_CONNECTION_STRING ||
    ""
  );
}

export function hasDefaultConnectionString() {
  return Boolean(process.env.SQLITECLOUD_CONNECTION_STRING || process.env.SQLITE_CLOUD_CONNECTION_STRING);
}

export async function createSQLiteCloudDb(connectionString: string): Promise<SQLiteCloudDb> {
  if (!connectionString) {
    throw new Error("SQLiteCloud connection string is missing.");
  }

  const { Database } = await import("@sqlitecloud/drivers");
  return new Database(connectionString) as SQLiteCloudDb;
}

function quote(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function nullable(value: string) {
  return value.trim() ? quote(value.trim()) : "NULL";
}

export function normalizeRows(result: unknown): Subscription[] {
  if (Array.isArray(result)) return result as Subscription[];
  if (result && typeof result === "object") {
    const candidate = result as { rows?: unknown; values?: unknown };
    if (Array.isArray(candidate.rows)) return candidate.rows as Subscription[];
    if (Array.isArray(candidate.values)) return candidate.values as Subscription[];
  }
  return [];
}

export async function ensureSubscriptionTable(db: SQLiteCloudDb) {
  for (const statement of subscriptionCreateTableSql.split(";").map((item) => item.trim()).filter(Boolean)) {
    await db.sql(statement);
  }
}

export async function listSubscriptions(db: SQLiteCloudDb) {
  await ensureSubscriptionTable(db);
  return normalizeRows(await db.sql("SELECT * FROM subscription ORDER BY COALESCE(nextdate, '9999-12-31') ASC, name ASC"));
}

export async function createSubscription(db: SQLiteCloudDb, draft: SubscriptionDraft & { id?: string }) {
  await ensureSubscriptionTable(db);
  const id = draft.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await db.sql(`INSERT OR REPLACE INTO subscription (
    id, name, site, price, currency, nextdate, account, note, continue, created_at, updated_at
  ) VALUES (
    ${quote(id)},
    ${quote(draft.name.trim())},
    ${nullable(draft.site)},
    ${Number(draft.price || 0)},
    ${quote((draft.currency || "TWD").toUpperCase())},
    ${nullable(draft.nextdate)},
    ${nullable(draft.account)},
    ${nullable(draft.note)},
    ${draft.continue ? 1 : 0},
    ${quote(now)},
    ${quote(now)}
  )`);
  return { id, ...draft, created_at: now, updated_at: now };
}

export async function updateSubscription(db: SQLiteCloudDb, id: string, draft: SubscriptionDraft) {
  await ensureSubscriptionTable(db);
  const now = new Date().toISOString();
  await db.sql(`UPDATE subscription SET
    name = ${quote(draft.name.trim())},
    site = ${nullable(draft.site)},
    price = ${Number(draft.price || 0)},
    currency = ${quote((draft.currency || "TWD").toUpperCase())},
    nextdate = ${nullable(draft.nextdate)},
    account = ${nullable(draft.account)},
    note = ${nullable(draft.note)},
    continue = ${draft.continue ? 1 : 0},
    updated_at = ${quote(now)}
    WHERE id = ${quote(id)}`);
  return { id, ...draft, updated_at: now };
}

export async function deleteSubscription(db: SQLiteCloudDb, id: string) {
  await ensureSubscriptionTable(db);
  await db.sql(`DELETE FROM subscription WHERE id = ${quote(id)}`);
}
