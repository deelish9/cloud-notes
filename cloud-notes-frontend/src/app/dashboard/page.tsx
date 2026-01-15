"use client";

import { useAuth, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import React, { useEffect, useRef, useState } from "react";

type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type VideoJob = {
  id: string;
  filename: string;
  status: string;
  transcript?: string | null;
  summary?: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const { getToken } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteStatus, setNoteStatus] = useState("");

  // Video jobs state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [videoStatus, setVideoStatus] = useState("");

  // -------------------------
  // NOTES
  // -------------------------
  async function fetchNotes() {
    try {
      setNoteStatus("Loading notes...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        setNoteStatus(`Error loading notes (${res.status}): ${text}`);
        return;
      }

      const data = await res.json();
      setNotes(data);
      setNoteStatus("");
    } catch (e: any) {
      setNoteStatus(`Error loading notes: ${e?.message || String(e)}`);
    }
  }

  async function createNote() {
    try {
      setNoteStatus("Creating note...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim() || "Untitled",
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setNoteStatus(`Create failed (${res.status}): ${text}`);
        return;
      }

      setTitle("");
      setContent("");
      await fetchNotes();
      setNoteStatus("");
    } catch (e: any) {
      setNoteStatus(`Error creating note: ${e?.message || String(e)}`);
    }
  }

  async function deleteNote(id: string) {
    try {
      setNoteStatus("Deleting note...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        setNoteStatus(`Delete failed (${res.status}): ${text}`);
        return;
      }

      await fetchNotes();
      setNoteStatus("");
    } catch (e: any) {
      setNoteStatus(`Error deleting note: ${e?.message || String(e)}`);
    }
  }

  // -------------------------
  // VIDEO JOBS
  // -------------------------
  async function fetchJobs() {
    try {
      setVideoStatus("Loading video jobs...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/video-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        setVideoStatus(`Error loading jobs (${res.status}): ${text}`);
        return;
      }

      const data = await res.json();
      setJobs(data);
      setVideoStatus("");
    } catch (e: any) {
      setVideoStatus(`Error loading jobs: ${e?.message || String(e)}`);
    }
  }

  async function uploadVideo() {
    if (!videoFile) {
      setVideoStatus("Pick a video first.");
      return;
    }

    try {
      setVideoStatus("Uploading...");
      const token = await getToken({ template: "cloud-notes" });

      const form = new FormData();
      // FastAPI upload route usually expects field name "file"
      form.append("file", videoFile);

      // ✅ IMPORTANT: match your backend docs
      const res = await fetch(`${apiUrl}/video-jobs/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        setVideoStatus(`Upload failed (${res.status}): ${text}`);
        return;
      }

      setVideoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchJobs();
      setVideoStatus("Uploaded ✅");
    } catch (e: any) {
      setVideoStatus(`Upload error: ${e?.message || String(e)}`);
    }
  }

  async function saveTranscript() {
    if (!selectedJobId) {
      setVideoStatus("Select a video job first.");
      return;
    }
    if (!transcriptText.trim()) {
      setVideoStatus("Paste a transcript first.");
      return;
    }

    try {
      setVideoStatus("Saving transcript...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/video-jobs/${selectedJobId}/transcript`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transcript: transcriptText }),
      });

      if (!res.ok) {
        const text = await res.text();
        setVideoStatus(`Save transcript failed (${res.status}): ${text}`);
        return;
      }

      setVideoStatus("Transcript saved ✅");
      await fetchJobs();
    } catch (e: any) {
      setVideoStatus(`Error saving transcript: ${e?.message || String(e)}`);
    }
  }

  async function generateSummary() {
    if (!selectedJobId) {
      setVideoStatus("Select a video job first.");
      return;
    }

    try {
      setVideoStatus("Generating summary...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/video-jobs/${selectedJobId}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        setVideoStatus(`Generate failed (${res.status}): ${text}`);
        return;
      }

      setVideoStatus("Summary generated ✅");
      await fetchJobs();
    } catch (e: any) {
      setVideoStatus(`Error generating summary: ${e?.message || String(e)}`);
    }
  }


  async function saveJobAsNote(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job?.summary) {
      setVideoStatus("No summary to save yet.");
      return;
    }

    try {
      setVideoStatus("Saving summary as a note...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `Summary: ${job.filename}`,
          content: job.summary,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setVideoStatus(`Save as note failed (${res.status}): ${text}`);
        return;
      }

      await fetchNotes();
      setVideoStatus("Saved to notes ✅");
    } catch (e: any) {
      setVideoStatus(`Save as note error: ${e?.message || String(e)}`);
    }
  }

  async function deleteJob(jobId: string) {
    try {
      setVideoStatus("Deleting job...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/video-jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        setVideoStatus(`Delete failed (${res.status}): ${text}`);
        return;
      }

      // If you deleted the selected one, clear it
      if (selectedJobId === jobId) {
        setSelectedJobId("");
        setTranscriptText("");
      }

      await fetchJobs();
      setVideoStatus("Deleted ✅");
    } catch (e: any) {
      setVideoStatus(`Error deleting job: ${e?.message || String(e)}`);
    }
  }

  useEffect(() => {
    fetchNotes();
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Dashboard</h1>
      <p style={{ marginTop: 6, color: "#666" }}>Your notes live here.</p>

      <SignedOut>
        <div style={{ marginTop: 16 }}>
          <p>You’re signed out.</p>
          <SignInButton />
        </div>
      </SignedOut>

      <SignedIn>
        {/* NOTES */}
        <section style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Create a note</h2>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              style={inputStyle}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={createNote} style={btnStyle}>Save Note</button>
              <button onClick={fetchNotes} style={btnStyleSecondary}>Refresh</button>
            </div>
            {noteStatus && <p style={{ color: "#444" }}>{noteStatus}</p>}
          </div>
        </section>

        {/* VIDEO */}
        <section style={{ marginTop: 18, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Video → Notes</h2>
          <p style={{ marginTop: 6, color: "#666" }}>
            Upload a video → paste transcript → generate key notes (AI later).
          </p>

          {/* Upload */}
          <div style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Upload a video</h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setVideoFile(f);
                if (f) setVideoStatus(`Selected: ${f.name}`);
              }}
            />

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={btnStyleSecondary} onClick={() => fileInputRef.current?.click()}>
                Choose Video
              </button>
              <button style={btnStyle} onClick={uploadVideo}>
                Upload Video
              </button>
              <button style={btnStyleSecondary} onClick={fetchJobs}>
                Refresh Jobs
              </button>
            </div>

            {videoFile && (
              <p style={{ marginTop: 10, color: "#444" }}>
                Ready: <b>{videoFile.name}</b> ({Math.round(videoFile.size / 1024 / 1024)} MB)
              </p>
            )}

            {videoStatus && <p style={{ marginTop: 10, color: "#444" }}>{videoStatus}</p>}
          </div>

          {/* Jobs list */}
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Your video jobs</h3>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {jobs.map((j) => (
                <div key={j.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <strong>{j.filename}</strong>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: "#555" }}>{j.status}</span>

                      <button
                        onClick={() => {
                          const ok = confirm(`Delete "${j.filename}"? This removes the job + transcript + summary.`);
                          if (ok) deleteJob(j.id);
                        }}
                        style={deleteBtnStyle}
                        title="Delete upload job"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <small style={{ color: "#777" }}>
                    {new Date(j.created_at).toLocaleString()}
                  </small>

                  {j.summary && (
                    <div style={{ marginTop: 10 }}>
                      <button onClick={() => saveJobAsNote(j.id)} style={btnStyle}>
                        Save Summary as Note
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {jobs.length === 0 && (
                <p style={{ color: "#666" }}>No video jobs yet — upload one above.</p>
              )}
            </div>
          </div>

          {/* Transcript + Generate */}
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <label style={{ fontWeight: 700 }}>Select a job (for transcript + summary)</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- choose --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.filename} ({j.status})
                </option>
              ))}
            </select>

            <label style={{ fontWeight: 700 }}>Paste transcript</label>
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              rows={6}
              placeholder="Paste transcript text here..."
              style={{ ...inputStyle, resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={saveTranscript} style={btnStyleSecondary}>Save Transcript</button>
              <button onClick={generateSummary} style={btnStyle}>Generate Summary</button>
            </div>
          </div>
        </section>

        {/* NOTES LIST */}
        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            Notes ({notes.length})
          </h2>

          <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
            {notes.map((n) => (
              <div key={n.id} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{n.title}</h3>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <small style={{ color: "#777" }}>
                      {new Date(n.created_at).toLocaleString()}
                    </small>

                    <button
                      onClick={() => deleteNote(n.id)}
                      style={deleteBtnStyle}
                      title="Delete note"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p style={{ marginTop: 8, marginBottom: 0, whiteSpace: "pre-wrap" }}>
                  {n.content}
                </p>
              </div>
            ))}

            {notes.length === 0 && (
              <p style={{ color: "#666" }}>No notes yet — create your first one above.</p>
            )}
          </div>
        </section>
      </SignedIn>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 14,
};

const btnStyle: React.CSSProperties = {
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const btnStyleSecondary: React.CSSProperties = {
  border: "1px solid #ccc",
  background: "#fff",
  color: "#111",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const deleteBtnStyle: React.CSSProperties = {
  border: "1px solid #b91c1c",
  background: "#fff",
  color: "#b91c1c",
  padding: "6px 10px",
  borderRadius: 10,
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 14,
};
