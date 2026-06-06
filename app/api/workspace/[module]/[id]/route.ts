import { NextResponse } from "next/server";
import { getWorkspaceModule } from "@/lib/workspace-modules";
import {
  deleteWorkspaceRecord,
  getConnectionString,
  updateWorkspaceRecord,
  withDb,
} from "@/lib/sqlite-cloud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ module: string; id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { module: moduleKey, id } = await context.params;
    const module = getWorkspaceModule(moduleKey);
    if (!module) return NextResponse.json({ error: "Unknown workspace module." }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const requiredField = module.fields.find((field) => field.required);
    if (requiredField && !String(body[requiredField.name] ?? "").trim()) {
      return NextResponse.json({ error: `${requiredField.name} is required.` }, { status: 400 });
    }
    const result = await withDb(getConnectionString(request.headers), (db) => updateWorkspaceRecord(db, module, id, body));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update workspace record." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { module: moduleKey, id } = await context.params;
    const module = getWorkspaceModule(moduleKey);
    if (!module) return NextResponse.json({ error: "Unknown workspace module." }, { status: 404 });
    await withDb(getConnectionString(request.headers), (db) => deleteWorkspaceRecord(db, module, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete workspace record." }, { status: 500 });
  }
}
