import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "PDF export now runs client-side in the browser. This endpoint is no longer used." },
    { status: 410 },
  );
}
