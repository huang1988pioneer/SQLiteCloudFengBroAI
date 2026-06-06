import { NextResponse } from "next/server";
import { createSQLiteCloudDb, createSubscription, getConnectionString, listSubscriptions } from "@/lib/sqlite-cloud";
import type { SubscriptionDraft } from "@/types/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const db = await createSQLiteCloudDb(getConnectionString(request.headers));
    return NextResponse.json(await listSubscriptions(db));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list subscriptions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscriptionDraft;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    const db = await createSQLiteCloudDb(getConnectionString(request.headers));
    return NextResponse.json(await createSubscription(db, body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create subscription." }, { status: 500 });
  }
}
