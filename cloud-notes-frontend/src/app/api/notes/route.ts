import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
    const { getToken } = await auth();
    const token = await getToken({ template: "cloud-notes" });

    if (!token) {
        return NextResponse.json({ error: "No auth token" }, { status: 401 });
    }

    const res = await fetch(`${BACKEND_URL}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text();
        return new NextResponse(text, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const { getToken } = await auth();
    const token = await getToken({ template: "cloud-notes" });

    if (!token) {
        return NextResponse.json({ error: "No auth token" }, { status: 401 });
    }

    const body = await req.json();

    const res = await fetch(`${BACKEND_URL}/notes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
    });
}
