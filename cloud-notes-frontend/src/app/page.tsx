import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Cloud Notes</h1>

      <SignedOut>
        <p style={{ marginTop: 12 }}>You are signed out.</p>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Sign up</Link>
        </div>
      </SignedOut>

      <SignedIn>
        <p style={{ marginTop: 12 }}>You are signed in.</p>
        <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
          <Link href="/dashboard">Go to dashboard</Link>
          <UserButton />
        </div>
      </SignedIn>
    </main>
  );
}
