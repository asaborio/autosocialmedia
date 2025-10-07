"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase-browser";

type Media = {
  id: string;
  path: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export default function LibraryPage() {
  const [files, setFiles] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const bootstrapped = useRef(false);

  // ---- AUTH BOOTSTRAP ----
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      // 1) Subscribe to auth changes for visibility
      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          console.log("[auth] state change:", _event, !!session);
          if (session) setAuthReady(true);
        }
      );

      // 2) Do we already have a session?
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        console.log("[auth] existing session found");
        setAuthReady(true);
      } else {
        // 3) Try anonymous sign-in (requires Anonymous provider enabled in dashboard)
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("[auth] anonymous sign-in error:", error.message);
        } else {
          console.log("[auth] anonymous sign-in started");
        }
      }

      // Cleanup
      return () => sub.subscription.unsubscribe();
    })();
  }, []);

  // ---- DATA ----
  const fetchMedia = useCallback(async () => {
    const { data, error } = await supabase
      .from("media_assets")
      .select("id, path, filename, mime_type, size_bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      console.error("fetchMedia error:", error.message, error);
      return;
    }
    setFiles((data || []) as Media[]);
  }, []);

  useEffect(() => {
    if (authReady) {
      console.log("[auth] ready → fetching media");
      fetchMedia();
    }
  }, [authReady, fetchMedia]);

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!authReady) {
      alert("Still preparing your session… try again in a moment.");
      e.currentTarget.value = "";
      return;
    }

    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id ?? "public";

      const ext = f.name.includes(".") ? f.name.split(".").pop() : "";
      const date = new Date().toISOString().slice(0, 10);
      const idPart =
        globalThis.crypto && "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : String(Date.now());

      const path = `${userId}/${date}/${idPart}${ext ? "." + ext : ""}`;

      // Storage upload
      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, f, { cacheControl: "3600", upsert: false });

      if (upErr) {
        console.error("Storage upload error:", upErr.message, upErr);
        alert(`Upload failed (storage): ${upErr.message}`);
        return;
      }

      // DB insert
      const { error: dbErr } = await supabase.from("media_assets").insert({
        path,
        filename: f.name,
        mime_type: f.type || null,
        size_bytes: f.size,
        uploaded_by: userId !== "public" ? userId : null,
      });

      if (dbErr) {
        console.error("DB insert error:", dbErr.message, dbErr);
        alert(`Upload failed (db): ${dbErr.message}`);
        return;
      }

      await fetchMedia();
    } catch (err: any) {
      console.error("upload error:", err?.message ?? err);
      alert("Upload failed. See console.");
    } finally {
      setLoading(false);
      e.currentTarget.value = "";
    }
  };

  const publicUrl = (path: string) => {
    const { data } = supabase.storage.from("assets").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 8 }}>
        Media Library
      </h1>

      {/* Status line so we can see what's happening */}
      <div style={{ marginBottom: 12, fontSize: 12, color: "#555" }}>
        Auth status: {authReady ? "ready ✅" : "preparing…"}
      </div>

      <label
        style={{
          display: "inline-block",
          border: "1px solid #ddd",
          padding: "8px 12px",
          borderRadius: 8,
          cursor: "pointer",
          // IMPORTANT: keep clickable even if auth not ready; we'll guard in code
          // opacity: authReady ? 1 : 0.8,
        }}
        title={authReady ? "Upload a file" : "We’ll sign you in automatically"}
      >
        Upload
        <input
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={onFileChange}
        />
      </label>

      {loading && (
        <span style={{ marginLeft: 12, fontSize: 12 }}>Uploading…</span>
      )}

      {files.length === 0 ? (
        <p style={{ color: "#666", marginTop: 16 }}>
          No media yet. Upload something to get started.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {files.map((f) => {
            const url = publicUrl(f.path);
            const isImage = f.mime_type?.startsWith("image/");
            return (
              <li
                key={f.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {isImage ? (
                  <img
                    src={url}
                    alt={f.filename}
                    style={{
                      width: "100%",
                      height: 160,
                      objectFit: "contain",
                      background: "#fff",
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: 160,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f5f5f5",
                      fontSize: 12,
                    }}
                  >
                    {f.filename}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 12,
                    color: "#666",
                    padding: "6px 8px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {f.filename}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
