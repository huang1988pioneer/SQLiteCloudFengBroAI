import { NextResponse } from "next/server";
import { hasDefaultConnectionString } from "@/lib/sqlite-cloud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ hasDefaultConnectionString: hasDefaultConnectionString() });
}
