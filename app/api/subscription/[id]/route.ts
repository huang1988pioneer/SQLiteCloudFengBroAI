import { NextResponse } from "next/server";
import { createSQLiteCloudDb, deleteSubscription, getConnectionString, updateSubscription } from "@/lib/sqlite-cloud";
import type { SubscriptionDraft } from "@/types/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as SubscriptionDraft;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    const db = await createSQLiteCloudDb(getConnectionString(request.headers));
    return NextResponse.json(await updateSubscription(db, id, body));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update subscription." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = await createSQLiteCloudDb(getConnectionString(request.headers));
    await deleteSubscription(db, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete subscription." }, { status: 500 });
  }
}
