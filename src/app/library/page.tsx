"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import Image from "next/image";

type Asset = {
  id: string;
  storagePath: string;
  kind: "image" | "video";
  createdAt: string;
};

export default function LibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/assets/list");
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`List failed: ${res.status} ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    setAssets(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleUpload() {
    try {
      setError(null);
      if (!file) return;

      // 1) Upload the file directly to Vercel Blob using client upload
      setUploading(true);
      const blobResult = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/handle-upload",
        contentType: file.type || "application/octet-stream",
      });

      // 3) Save a DB row pointing at the blob URL
      const createRes = await fetch("/api/assets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: blobResult.url,
          kind: file.type.startsWith("video") ? "video" : "image",
        }),
      });
      if (!createRes.ok) {
        const text = await createRes.text();
        throw new Error(
          `DB save failed: ${createRes.status} ${text.slice(0, 200)}`
        );
      }

      setFile(null);
      await refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Library</h1>

      <div className="rounded-xl border p-4 space-y-3">
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          className="rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
          disabled={!file || isUploading}
          onClick={handleUpload}
        >
          {isUploading ? "Uploading…" : "Upload"}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {assets.map((a) => (
          <div key={a.id} className="border rounded-lg overflow-hidden">
            {a.kind === "image" ? (
              <div className="w-full h-48 relative">
                <Image
                  src={a.storagePath}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <video
                src={a.storagePath}
                className="w-full h-48 object-cover"
                controls
              />
            )}
            <div className="p-2 text-xs text-gray-600">
              {new Date(a.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
