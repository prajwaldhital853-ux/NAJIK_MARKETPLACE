import { NextResponse } from "next/server";
import { getApplication, setApplicationStatus } from "@/lib/provider-store";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = await getApplication(id);
  if (!item) return NextResponse.json({ detail: "Not found" }, { status: 404, headers: cors });
  return NextResponse.json(item, { headers: cors });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { status?: "verified" | "rejected" };
  if (body.status !== "verified" && body.status !== "rejected") {
    return NextResponse.json({ detail: "Invalid status" }, { status: 400, headers: cors });
  }
  const item = await setApplicationStatus(id, body.status);
  if (!item) return NextResponse.json({ detail: "Not found" }, { status: 404, headers: cors });
  return NextResponse.json(item, { headers: cors });
}
