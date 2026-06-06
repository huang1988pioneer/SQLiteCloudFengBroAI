import { NextResponse } from "next/server";
import {
  createSQLiteCloudDb,
  ensureSubscriptionTable,
  ensureWorkspaceTables,
  getConnectionString,
  workspaceCreateTableSql,
} from "@/lib/sqlite-cloud";
import { subscriptionCreateTableSql } from "@/lib/subscription-schema";
import { workspaceModules } from "@/lib/workspace-modules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const db = await createSQLiteCloudDb(getConnectionString(request.headers));
    await ensureSubscriptionTable(db);
    await ensureWorkspaceTables(db, workspaceModules);
    return NextResponse.json({
      ok: true,
      tables: ["subscription", ...workspaceModules.map((module) => module.table)],
      sql: [subscriptionCreateTableSql, ...workspaceModules.map((module) => workspaceCreateTableSql(module))],
      message: "鋒兄全部資料表已建立或確認存在。",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create workspace tables." },
      { status: 500 }
    );
  }
}
