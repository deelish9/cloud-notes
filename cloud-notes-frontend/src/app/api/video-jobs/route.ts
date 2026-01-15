import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  const { getToken } = await auth();
  const token = await getToken({ template: "cloud-notes" });

  if (!token) {
    return NextResponse.json({ error: "No auth token" }, { status: 401 });
  }

  const res = await fetch(`${BACKEND_URL}/video-jobs`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}
