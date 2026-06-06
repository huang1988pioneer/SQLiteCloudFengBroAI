import { NextResponse } from "next/server";
import { deleteSubscription, getConnectionString, updateSubscription, withDb } from "@/lib/sqlite-cloud";
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
    const result = await withDb(getConnectionString(request.headers), (db) => updateSubscription(db, id, body));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update subscription." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await withDb(getConnectionString(request.headers), (db) => deleteSubscription(db, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete subscription." }, { status: 500 });
  }
}
