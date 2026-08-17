import { NextResponse } from "next/server";
import { addApplication, findApplicationByContact, listApplications } from "@/lib/provider-store";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");
  if (email || phone) {
    const match = await findApplicationByContact({ email, phone });
    return NextResponse.json(match, { headers: cors });
  }
  const items = await listApplications();
  return NextResponse.json(items, { headers: cors });
}

export async function POST(request: Request) {
  const body = await request.json();
  const item = await addApplication(body);
  return NextResponse.json(item, { headers: cors });
}
