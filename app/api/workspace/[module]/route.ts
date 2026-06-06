import { NextResponse } from "next/server";
import { getWorkspaceModule } from "@/lib/workspace-modules";
import {
  createWorkspaceRecord,
  getConnectionString,
  listWorkspaceRecords,
  withDb,
} from "@/lib/sqlite-cloud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ module: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { module: moduleKey } = await context.params;
    const module = getWorkspaceModule(moduleKey);
    if (!module) return NextResponse.json({ error: "Unknown workspace module." }, { status: 404 });
    const rows = await withDb(getConnectionString(request.headers), (db) => listWorkspaceRecords(db, module));
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list workspace records." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { module: moduleKey } = await context.params;
    const module = getWorkspaceModule(moduleKey);
    if (!module) return NextResponse.json({ error: "Unknown workspace module." }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown> & { id?: string };
    const requiredField = module.fields.find((field) => field.required);
    if (requiredField && !String(body[requiredField.name] ?? "").trim()) {
      return NextResponse.json({ error: `${requiredField.name} is required.` }, { status: 400 });
    }
    const result = await withDb(getConnectionString(request.headers), (db) => createWorkspaceRecord(db, module, body));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create workspace record." }, { status: 500 });
  }
}
