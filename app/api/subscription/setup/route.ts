import { NextResponse } from "next/server";
import { subscriptionCreateTableSql, subscriptionSchema } from "@/lib/subscription-schema";
import { ensureSubscriptionTable, getConnectionString, withDb } from "@/lib/sqlite-cloud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const connectionString = getConnectionString(request.headers);
    await withDb(connectionString, (db) => ensureSubscriptionTable(db));

    return NextResponse.json({
      ok: true,
      table: "subscription",
      appwriteCsvHeaders: ["name", "site", "price", "nextdate", "note", "account", "currency", "continue"],
      sqliteColumns: subscriptionSchema.map((field) => field.name),
      sql: subscriptionCreateTableSql,
      message: "Table subscription 已建立或確認存在。",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create subscription table." },
      { status: 500 }
    );
  }
}
