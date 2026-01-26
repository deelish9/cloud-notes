import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // In Next.js 15+, params is a Promise
) {
    const { getToken } = await auth();
    const token = await getToken({ template: "cloud-notes" });

    if (!token) {
        return NextResponse.json({ error: "No auth token" }, { status: 401 });
    }

    const { id } = await params;

    const res = await fetch(`${BACKEND_URL}/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });

    const text = await res.text();
    return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
    });
}
