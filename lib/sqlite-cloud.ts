import { subscriptionCreateTableSql } from "@/lib/subscription-schema";
import type { Subscription, SubscriptionDraft } from "@/types/subscription";
import type { WorkspaceModule, WorkspaceRecord } from "@/types/workspace";

export type SQLiteCloudDb = {
  sql: (query: string) => Promise<unknown>;
  close: (callback?: (err: Error | null) => void) => void;
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

/**
 * Execute a callback with a database connection that is automatically closed
 * when the callback completes (or throws). This prevents connection leaks
 * that would otherwise exhaust the 20-connection limit on the free plan.
 */
export async function withDb<T>(connectionString: string, fn: (db: SQLiteCloudDb) => Promise<T>): Promise<T> {
  const db = await createSQLiteCloudDb(connectionString);
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

function quote(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function nullable(value: string) {
  return value.trim() ? quote(value.trim()) : "NULL";
}

function sqlIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function fieldSqlType(type: string) {
  return type === "number" ? "REAL" : "TEXT";
}

function sqlValue(value: unknown, type: string) {
  if (type === "number") {
    const number = Number(value || 0);
    return Number.isNaN(number) ? "0" : String(number);
  }
  const text = String(value ?? "").trim();
  return text ? quote(text) : "NULL";
}

export function normalizeRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object") {
    const candidate = result as { rows?: unknown; values?: unknown };
    if (Array.isArray(candidate.rows)) return candidate.rows as T[];
    if (Array.isArray(candidate.values)) return candidate.values as T[];
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

export function workspaceCreateTableSql(module: WorkspaceModule) {
  const columns = module.fields.map((field) => {
    const required = field.required ? " NOT NULL" : "";
    return `${sqlIdentifier(field.name)} ${fieldSqlType(field.type)}${required}`;
  });
  return `CREATE TABLE IF NOT EXISTS ${sqlIdentifier(module.table)} (
  id TEXT PRIMARY KEY,
  ${columns.join(",\n  ")},
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
}

export async function ensureWorkspaceTable(db: SQLiteCloudDb, module: WorkspaceModule) {
  await db.sql(workspaceCreateTableSql(module));
}

export async function ensureWorkspaceTables(db: SQLiteCloudDb, modules: WorkspaceModule[]) {
  for (const module of modules) {
    await ensureWorkspaceTable(db, module);
  }
}

export async function listWorkspaceRecords(db: SQLiteCloudDb, module: WorkspaceModule) {
  await ensureWorkspaceTable(db, module);
  const firstDate = module.fields.find((field) => field.type === "date")?.name;
  const primary = module.fields[0]?.name || "id";
  const order = firstDate
    ? `ORDER BY COALESCE(${sqlIdentifier(firstDate)}, '9999-12-31') ASC, ${sqlIdentifier(primary)} ASC`
    : `ORDER BY ${sqlIdentifier(primary)} ASC`;
  return normalizeRows<WorkspaceRecord>(await db.sql(`SELECT * FROM ${sqlIdentifier(module.table)} ${order}`));
}

export async function createWorkspaceRecord(db: SQLiteCloudDb, module: WorkspaceModule, record: Record<string, unknown> & { id?: string }) {
  await ensureWorkspaceTable(db, module);
  const id = record.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const columns = module.fields.map((field) => sqlIdentifier(field.name));
  const values = module.fields.map((field) => sqlValue(record[field.name], field.type));
  await db.sql(`INSERT OR REPLACE INTO ${sqlIdentifier(module.table)} (
    id, ${columns.join(", ")}, created_at, updated_at
  ) VALUES (
    ${quote(id)}, ${values.join(", ")}, ${quote(now)}, ${quote(now)}
  )`);
  return { id, ...record, created_at: now, updated_at: now };
}

export async function updateWorkspaceRecord(db: SQLiteCloudDb, module: WorkspaceModule, id: string, record: Record<string, unknown>) {
  await ensureWorkspaceTable(db, module);
  const now = new Date().toISOString();
  const assignments = module.fields.map((field) => `${sqlIdentifier(field.name)} = ${sqlValue(record[field.name], field.type)}`);
  await db.sql(`UPDATE ${sqlIdentifier(module.table)} SET
    ${assignments.join(",\n    ")},
    updated_at = ${quote(now)}
    WHERE id = ${quote(id)}`);
  return { id, ...record, updated_at: now };
}

export async function deleteWorkspaceRecord(db: SQLiteCloudDb, module: WorkspaceModule, id: string) {
  await ensureWorkspaceTable(db, module);
  await db.sql(`DELETE FROM ${sqlIdentifier(module.table)} WHERE id = ${quote(id)}`);
}
