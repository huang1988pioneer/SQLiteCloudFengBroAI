import { NextResponse } from "next/server";
import { createSubscription, getConnectionString, listSubscriptions, withDb } from "@/lib/sqlite-cloud";
import type { SubscriptionDraft } from "@/types/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const rows = await withDb(getConnectionString(request.headers), (db) => listSubscriptions(db));
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list subscriptions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscriptionDraft & { id?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    const result = await withDb(getConnectionString(request.headers), (db) => createSubscription(db, body));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create subscription." }, { status: 500 });
  }
}
