import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", minHeight: "100vh" }}>

      {/* HEADER */}
      <header className="container-padding" style={{
        padding: "20px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--card-border)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.png" alt="Cloud Notes Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>
            Cloud Notes
          </div>
        </div>
        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <button style={btnTypeSecondary}>Sign In</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" style={btnTypePrimary}>
              <span className="hide-on-mobile">Go to Dashboard</span>
              <span className="show-on-mobile">Dashboard</span>
            </Link>
          </SignedIn>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="container-padding" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px" }}>

        <div style={{
          background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontWeight: 800,
          fontSize: 14,
          marginBottom: 24,
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          AI-Powered Productivity
        </div>

        <h1 style={{
          fontSize: "clamp(32px, 10vw, 72px)",
          fontWeight: 800,
          lineHeight: 1.1,
          maxWidth: 900,
          marginBottom: 24,
          letterSpacing: "-2px"
        }}>
          Transform Videos into <br />
          <span style={{ color: "var(--foreground)", opacity: 0.5 }}>Perfect Notes.</span>
        </h1>

        <p style={{
          fontSize: "clamp(16px, 4vw, 20px)",
          color: "var(--foreground)",
          opacity: 0.6,
          maxWidth: 600,
          lineHeight: 1.6,
          marginBottom: 40
        }}>
          Upload any video url or file. Our AI extracts the audio, transcribes it, and generates structured, readable notes instantly.
        </p>

        <div style={{ display: "flex", gap: 16, flexDirection: "column", alignItems: "center" }}>
          <SignedOut>
            <SignInButton mode="modal">
              <button style={{ ...btnTypePrimary, padding: "16px 32px", fontSize: 18, width: "100%", maxWidth: 300 }}>
                Get Started for Free
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" style={{ ...btnTypePrimary, padding: "16px 32px", fontSize: 18, width: "100%", maxWidth: 300 }}>
              Launch Studio
            </Link>
          </SignedIn>
        </div>

        {/* FEATURE HIGHLIGHTS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginTop: 100, maxWidth: 1200, width: "100%", textAlign: "left" }}>
          <FeatureCard
            icon="🎥"
            title="Video to Text"
            desc="Drag and drop your video files. We handle the heavy lifting of audio extraction and transcription."
          />
          <FeatureCard
            icon="✨"
            title="AI Summaries"
            desc="Don't watch the whole thing. Get a concise summary of the key points, action items, and takeaways."
          />
          <FeatureCard
            icon="🔒"
            title="Private & Secure"
            desc="Your data is yours. Securely stored in the cloud and accessible only by you, from anywhere."
          />
        </div>

      </main>

      {/* FOOTER */}
      <footer className="container-padding" style={{ padding: 40, textAlign: "center", borderTop: "1px solid var(--card-border)", opacity: 0.4, fontSize: 14 }}>
        © 2026 Cloud Notes. All rights reserved.
      </footer>
    </div>
  );
}

// COMPONENTS & STYLES
function FeatureCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div style={{
      padding: 32,
      borderRadius: 16,
      border: "1px solid var(--card-border)",
      background: "var(--card-bg)"
    }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <p style={{ opacity: 0.6, lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

const btnTypePrimary: React.CSSProperties = {
  background: "var(--primary)",
  color: "var(--primary-fg)",
  padding: "10px 20px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  border: "none",
  textDecoration: "none",
  display: "inline-block",
  transition: "opacity 0.2s"
};

const btnTypeSecondary: React.CSSProperties = {
  background: "transparent",
  color: "var(--foreground)",
  padding: "10px 20px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  border: "1px solid var(--card-border)",
  textDecoration: "none",
  display: "inline-block"
};
