"use client";

import { useAuth, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useState } from "react";

export default function ApiTestPage() {
  const { getToken } = useAuth();
  const [out, setOut] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  async function callMe() {
    try {
      setOut("Calling /me...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOut(`Status: ${res.status}\n\n${await res.text()}`);
    } catch (err: any) {
      setOut(`Error: ${err?.message || String(err)}`);
    }
  }

  async function createNote() {
    try {
      setOut("Creating note...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "My first note",
          content: "This note was created from the frontend.",
        }),
      });

      setOut(`Status: ${res.status}\n\n${await res.text()}`);
    } catch (err: any) {
      setOut(`Error: ${err?.message || String(err)}`);
    }
  }

  async function listNotes() {
    try {
      setOut("Fetching notes...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOut(`Status: ${res.status}\n\n${await res.text()}`);
    } catch (err: any) {
      setOut(`Error: ${err?.message || String(err)}`);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>API Test</h1>
      <p style={{ marginTop: 6 }}>Backend: {apiUrl}</p>

      <SignedOut>
        <p style={{ marginTop: 12 }}>You’re signed out.</p>
        <SignInButton />
      </SignedOut>

      <SignedIn>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={callMe} style={btnStyle}>Call /me</button>
          <button onClick={createNote} style={btnStyle}>POST /notes</button>
          <button onClick={listNotes} style={btnStyle}>GET /notes</button>
        </div>

        <pre style={preStyle}>{out}</pre>
      </SignedIn>
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer",
};

const preStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 8,
  whiteSpace: "pre-wrap",
};
