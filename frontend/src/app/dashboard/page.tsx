"use client";

import { useAuth, SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  video_url?: string | null; // The underlying blob name
  transcript?: string | null;
  summary?: string | null;
  signed_url?: string | null;
  created_at: string;
};

// Helper to map status to percentage
function getJobProgress(status: string): number {
  switch (status) {
    case "queued": return 5;
    case "processing": return 15;
    case "audio_extracted": return 35;
    case "transcribing": return 65;
    case "transcribed": return 100;
    case "ready": return 100;
    case "failed": return 100; // Full bar but red
    default: return 0;
  }
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i}>{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function MarkdownViewer({ content, searchQuery = "" }: { content: string; searchQuery?: string }) {
  const components = {
    text: ({ node, children, ...props }: any) => {
      // Highlighting in text nodes
      if (typeof children === "string" && searchQuery) {
        return <HighlightText text={children} query={searchQuery} />;
      }
      return children;
    },
  };

  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Video jobs state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [videoStatus, setVideoStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState<"video" | "notes">("video");
  const [searchQuery, setSearchQuery] = useState("");
  const [showVideo, setShowVideo] = useState(false);
  const [stableSignedUrl, setStableSignedUrl] = useState<string | null>(null);

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

  async function updateNote() {
    if (!editingNote) return;

    try {
      setNoteStatus("Updating note...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/notes/${editingNote.id}`, {
        method: "PUT",
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
        setNoteStatus(`Update failed (${res.status}): ${text}`);
        return;
      }

      setTitle("");
      setContent("");
      setEditingNote(null);
      await fetchNotes();
      setNoteStatus("");
    } catch (e: any) {
      setNoteStatus(`Error updating note: ${e?.message || String(e)}`);
    }
  }

  function startEditing(note: Note) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    // Modal handles focus, no need to scroll
  }

  function cancelEditing() {
    setEditingNote(null);
    setTitle("");
    setContent("");
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
  // DRAG & DROP HANDLERS
  // -------------------------
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("video/")) {
      setVideoFile(f);
      setVideoStatus(`Selected: ${f.name}`);
    } else {
      setVideoStatus("Please drop a valid video file.");
    }
  };

  // -------------------------
  // VIDEO JOBS
  // -------------------------
  async function fetchJobs(isBackground = false) {
    try {
      if (!isBackground) setVideoStatus("Loading video jobs...");
      const token = await getToken({ template: "cloud-notes" });

      const res = await fetch(`${apiUrl}/video-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        setVideoStatus(`Error loading jobs (${res.status}): ${text}`);
        return;
      }

      const data: VideoJob[] = await res.json();

      setJobs((prevJobs) => {
        return data.map((newJob) => {
          const oldJob = prevJobs.find((pj) => pj.id === newJob.id);

          // If we have an old version of this job and the base video_url (blob) is the same,
          // preserve the old signed_url to avoid triggering a re-render/re-load of the video player.
          if (oldJob && oldJob.video_url === newJob.video_url && oldJob.signed_url) {
            return {
              ...newJob,
              signed_url: oldJob.signed_url
            };
          }
          return newJob;
        });
      });
      if (!isBackground) setVideoStatus("");
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
      setVideoStatus("Initializing upload...");
      const token = await getToken({ template: "cloud-notes" });

      // Step 1: Get Signed URL
      const urlRes = await fetch(`${apiUrl}/video-jobs/signed-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content_type: videoFile.type }),
      });

      if (!urlRes.ok) {
        const text = await urlRes.text();
        setVideoStatus(`Init failed: ${text}`);
        return;
      }
      const { url, blob_name } = await urlRes.json();

      // Step 2: Upload to GCS
      setVideoStatus("Uploading to cloud...");
      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": videoFile.type,
        },
        body: videoFile,
      });

      if (!uploadRes.ok) {
        setVideoStatus("Upload to cloud failed.");
        return;
      }

      // Step 3: Create Job Record
      setVideoStatus("Finalizing...");
      const jobRes = await fetch(`${apiUrl}/video-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: videoFile.name,
          blob_name: blob_name,
        }),
      });

      if (!jobRes.ok) {
        const text = await jobRes.text();
        setVideoStatus(`Job creation failed: ${text}`);
        return;
      }

      setVideoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchJobs();
      setVideoStatus("Uploaded ✅ Processing automatically...");

      setTimeout(() => fetchJobs(), 3000);
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

    const interval = setInterval(() => {
      fetchJobs(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Update stableSignedUrl only when selectedJobId changes or a new URL becomes available for the current job.
  // This prevents the video player from restarting every 5s due to polling.
  useEffect(() => {
    const currentJob = jobs.find(j => j.id === selectedJobId);
    const newUrl = currentJob?.signed_url || null;

    if (!selectedJobId) {
      setStableSignedUrl(null);
      return;
    }

    // Only update if the URL was null (first time arrival) or if the job ID itself is different.
    // If the URL exists and we are just getting a "fresher" signed URL for the SAME job,
    // we keep the OLD one in the player to avoid a reload.
    if (newUrl && (!stableSignedUrl || jobs.find(j => j.signed_url === stableSignedUrl)?.id !== selectedJobId)) {
      setStableSignedUrl(newUrl);
    }
  }, [selectedJobId, jobs, stableSignedUrl]);

  function renderVideoStudio() {
    return (
      <div className="dashboard-container">
        {/* LEFT PANEL: LIST & UPLOAD (35%) */}
        <div className="dashboard-sidebar">

          {/* Upload Card */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>New Project</h3>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                background: isDragging ? "rgba(255,255,255,0.05)" : "var(--background)",
                border: isDragging ? "2px dashed var(--primary-fg)" : "2px dashed var(--card-border)",
                borderRadius: 8,
                padding: 24,
                textAlign: "center",
                transition: "all 0.2s ease"
              }}
            >
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
              <div style={{ marginBottom: 12, fontSize: 32 }}>☁️</div>
              {videoFile ? (
                <div style={{ fontSize: 14, fontWeight: 600 }}>{videoFile.name}</div>
              ) : (
                <div style={{ fontSize: 14, color: "var(--foreground)", opacity: 0.7 }}>Drag & drop or click to upload</div>
              )}

              <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {!videoFile && (
                  <button style={{ ...btnStyleSecondary, flex: "1 1 auto" }} onClick={() => fileInputRef.current?.click()}>
                    Pick Video
                  </button>
                )}
                {videoFile && (
                  <>
                    <button style={{ ...btnStyleSecondary, color: "#ef4444", borderColor: "#ef4444", flex: "1 1 auto" }} onClick={() => {
                      setVideoFile(null);
                      setVideoStatus("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}>
                      Remove
                    </button>
                    <button style={{ ...btnStyle, flex: "1 1 auto" }} onClick={uploadVideo}>
                      Upload to Studio
                    </button>
                  </>
                )}
              </div>
            </div>
            {videoStatus && <p style={{ marginTop: 12, fontSize: 13, color: "var(--foreground)", opacity: 0.7, textAlign: "center" }}>{videoStatus}</p>}
          </div>

          {/* Jobs List */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Jobs</h3>
              <button style={{ ...btnStyleSecondary, padding: "4px 8px", fontSize: 12 }} onClick={() => fetchJobs()} className="btn-interactive">
                Refresh
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {jobs.map((j) => (
                <div
                  key={j.id}
                  className="card-interactive"
                  style={{
                    ...cardStyle,
                    cursor: "pointer",
                    background: selectedJobId === j.id ? "var(--background)" : "var(--card-bg)",
                    // Border is handled by class, but selected state needs override
                    border: selectedJobId === j.id ? "2px solid var(--primary-fg)" : undefined
                  }}
                  onClick={() => {
                    setSelectedJobId(j.id);
                    setShowVideo(false);
                    if (j.transcript) setTranscriptText(j.transcript);
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {j.filename}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteJob(j.id);
                      }}
                      style={miniDeleteBtnStyle}
                      className="btn-interactive"
                      title="Delete Job"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Progress */}
                  <div style={{ marginTop: 8, height: 4, background: "var(--background)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      width: `${getJobProgress(j.status)}%`,
                      height: "100%",
                      background: j.status === "failed" ? "#ef4444" : "var(--primary-fg)",
                      opacity: ["processing", "audio_extracted", "transcribing"].includes(j.status) ? 0.8 : 1
                    }} />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--foreground)", opacity: 0.6 }}>
                    <span>{j.status}</span>
                    <span>{new Date(j.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {jobs.length === 0 && <p style={{ color: "var(--foreground)", opacity: 0.5, fontSize: 14, fontStyle: "italic" }}>No jobs yet.</p>}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: INSPECTOR (65%) */}
        <div className="dashboard-main">
          {!selectedJobId ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)", opacity: 0.4, flexDirection: "column" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👈</div>
              <p>Select a job from the list to view details</p>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Workspace</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => deleteJob(selectedJobId)} style={deleteBtnStyle} className="btn-interactive">Delete Job</button>
                </div>
              </div>

              {/* Video Player */}
              {/* Video Player Section */}
              {jobs.find(j => j.id === selectedJobId)?.signed_url && (
                <div style={{ marginBottom: 24 }}>
                  {!showVideo ? (
                    <button
                      onClick={() => setShowVideo(true)}
                      style={{ ...btnStyleSecondary, width: "100%", padding: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, border: "2px dashed var(--card-border)" }}
                    >
                      <span style={{ fontSize: 24 }}>▶️</span>
                      <span style={{ fontWeight: 600 }}>Watch Video</span>
                    </button>
                  ) : (
                    <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", border: "1px solid var(--card-border)" }}>
                      <video
                        controls
                        autoPlay
                        style={{ width: "100%", display: "block", maxHeight: 400 }}
                        src={stableSignedUrl || ""}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Summary Section */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>AI Summary</h3>
                  <button onClick={generateSummary} style={btnStyle} className="btn-interactive">
                    {jobs.find(j => j.id === selectedJobId)?.status === "done" ? "🔄 Regenerate Summary" :
                      jobs.find(j => j.id === selectedJobId)?.status === "failed" ? "🔄 Try Again" :
                        "✨ Generate Summary"}
                  </button>
                </div>

                {jobs.find(j => j.id === selectedJobId)?.summary ? (
                  <div style={{ background: "var(--card-bg)", padding: 20, borderRadius: 12, border: "1px solid var(--card-border)", color: "var(--foreground)" }}>
                    <div style={{ maxHeight: "400px", overflowY: "auto", marginBottom: 20 }}>
                      <MarkdownViewer content={jobs.find(j => j.id === selectedJobId)?.summary || ""} searchQuery={searchQuery} />
                    </div>
                    <div style={{ paddingTop: 16, borderTop: "1px solid var(--card-border)" }}>
                      <button onClick={() => saveJobAsNote(selectedJobId)} style={{ ...btnStyleSecondary, width: "100%" }} className="btn-interactive">Save to Notebook</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 24, borderRadius: 12, background: "var(--background)", color: "var(--foreground)", opacity: 0.7, fontStyle: "italic" }}>
                    No summary generated yet. Click the button above.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderNotebook() {
    return (
      <div style={{ marginTop: 24 }}>
        {/* Create Note Bar - Always for Creation now */}
        <div style={{ background: "var(--card-bg)", padding: 20, borderRadius: 12, border: "1px solid var(--card-border)", marginBottom: 24, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title..."
              style={{ ...inputStyle, flex: "1 1 200px", fontWeight: 600 }}
            />
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Take a quick note..."
              style={{ ...inputStyle, flex: "2 1 300px" }}
            />
            <button onClick={createNote} style={{ ...btnStyle, flex: "1 1 auto" }} className="btn-interactive">Add Note</button>
          </div>
          {noteStatus && <p style={{ marginTop: 8, fontSize: 13, color: "var(--foreground)", opacity: 0.7 }}>{noteStatus}</p>}
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: 24 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search notes..."
            style={{ ...inputStyle, width: "100%", padding: "12px 16px", fontSize: 16 }}
          />
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {notes.filter(n =>
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.content.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((n) => (
            <div key={n.id} style={{ ...cardStyle, display: "flex", flexDirection: "column", height: 280 }} className="card-interactive">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "flex-start" }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  <HighlightText text={n.title} query={searchQuery} />
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {/* Maximize / Edit Button */}
                  <button
                    onClick={() => startEditing(n)}
                    style={{ ...deleteBtnStyle, background: "var(--card-border)", color: "var(--foreground)" }}
                    className="btn-interactive"
                    title="Edit Full Screen"
                  >
                    ⤢
                  </button>
                  <button onClick={() => deleteNote(n.id)} style={{ ...deleteBtnStyle, background: "transparent" }} className="btn-interactive">×</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", fontSize: 14, color: "var(--foreground)", background: "var(--background)", padding: 12, borderRadius: 8, border: "1px solid var(--card-border)" }}>
                <MarkdownViewer content={n.content} searchQuery={searchQuery} />
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--card-border)", fontSize: 12, color: "var(--foreground)", opacity: 0.5 }}>
                {new Date(n.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
          {notes.length === 0 && <p style={{ color: "var(--foreground)", opacity: 0.5, gridColumn: "1/-1", textAlign: "center", padding: 40 }}>No notes found.</p>}
        </div>

        {/* Full Screen Editor Modal */}
        {editingNote && (
          <div className="modal-overlay">
            <div className="modal-content">
              {/* Modal Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    background: "transparent",
                    border: "none",
                    color: "var(--foreground)",
                    width: "100%",
                    outline: "none"
                  }}
                  placeholder="Untitled Note"
                />
                <button onClick={cancelEditing} style={{ fontSize: 24, cursor: "pointer", background: "transparent", border: "none", color: "var(--foreground)", opacity: 0.5 }}>
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: "var(--foreground)",
                  border: "none",
                  resize: "none",
                  fontSize: 18,
                  lineHeight: 1.6,
                  outline: "none",
                  fontFamily: "var(--font-sans)"
                }}
                placeholder="Start writing..."
              />

              {/* Modal Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--card-border)" }}>
                <button onClick={cancelEditing} style={{ ...btnStyleSecondary, fontSize: 16, padding: "10px 24px" }} className="btn-interactive">Cancel</button>
                <button onClick={updateNote} style={{ ...btnStyle, fontSize: 16, padding: "10px 24px" }} className="btn-interactive">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="container-padding" style={{ padding: 24, paddingBottom: 100, maxWidth: 1200, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="Cloud Notes Logo" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div>
              <h1 style={{ fontSize: "clamp(24px, 5vw, 28px)", fontWeight: 800, letterSpacing: "-0.5px" }}>Cloud Notes</h1>
              <p className="hide-on-mobile" style={{ marginTop: 4, color: "var(--foreground)", opacity: 0.6 }}>AI-Powered Video Summarizer</p>
            </div>
          </div>
          <div className="show-on-mobile">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        <SignedIn>
          <div style={{ display: "flex", gap: 8, background: "var(--card-bg)", border: "1px solid var(--card-border)", padding: 4, borderRadius: 12, width: "100%", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, flex: 1 }}>
              <button
                onClick={() => setActiveTab("video")}
                style={{ ...activeTab === "video" ? activeTabStyle : inactiveTabStyle, flex: 1, padding: "8px 12px" }}
              >
                <span className="hide-on-mobile">📹 Video Studio</span>
                <span className="show-on-mobile">📹 Studio</span>
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                style={{ ...activeTab === "notes" ? activeTabStyle : inactiveTabStyle, flex: 1, padding: "8px 12px" }}
              >
                <span className="hide-on-mobile">📝 Notebook</span>
                <span className="show-on-mobile">📝 Notes</span>
              </button>
            </div>
            <div className="hide-on-mobile" style={{ width: 1, height: 24, background: "var(--card-border)", margin: "0 8px" }} />
            <div className="hide-on-mobile">
              <UserButton afterSignOutUrl="/" />
            </div>
            <SignOutButton>
              <button style={{ ...inactiveTabStyle, opacity: 1, color: "#ef4444", fontWeight: 700, padding: "8px 12px" }}>
                <span className="hide-on-mobile">Sign Out</span>
                <span className="show-on-mobile">Exit</span>
              </button>
            </SignOutButton>
          </div>
        </SignedIn>
      </div>

      <SignedOut>
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Welcome back</h2>
          <SignInButton mode="modal">
            <button style={btnStyle}>Sign In to Continue</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        {activeTab === "video" ? renderVideoStudio() : renderNotebook()}
      </SignedIn>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--card-border)",
  background: "var(--background)",
  color: "var(--foreground)",
  padding: "10px 12px",
  borderRadius: 8,
  fontSize: 14,
  width: "100%",
  transition: "border-color 0.2s",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  background: "var(--primary)",
  color: "var(--primary-fg)",
  padding: "8px 16px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  border: "none",
  transition: "opacity 0.2s",
};

const btnStyleSecondary: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  color: "var(--foreground)",
  padding: "8px 16px",
  borderRadius: 8,
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  transition: "background 0.2s",
};

const deleteBtnStyle: React.CSSProperties = {
  background: "rgba(239, 68, 68, 0.1)", // Red-500 with opacity
  color: "#ef4444",
  padding: "6px 12px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
};

const miniDeleteBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "#ef4444",
  padding: "4px",
  borderRadius: "6px",
  fontSize: "14px",
  cursor: "pointer",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cardStyle: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
};

const activeTabStyle: React.CSSProperties = {
  background: "var(--card-bg)",
  color: "var(--foreground)",
  padding: "6px 20px",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  border: "1px solid var(--card-border)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const inactiveTabStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--foreground)",
  opacity: 0.6,
  padding: "6px 20px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  border: "1px solid transparent",
};
