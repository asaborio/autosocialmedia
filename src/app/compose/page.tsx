"use client";

import { useEffect, useState } from "react";

type Asset = { id: string; storagePath: string; kind: "image" | "video" };

export default function ComposePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  // For MVP we’ll input these manually; later you’ll fetch them from your Accounts table.
  const [igUserId, setIgUserId] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/assets/list");
      const data = await res.json();
      const onlyImages = (data as Asset[]).filter((a) => a.kind === "image");
      setAssets(onlyImages);
      if (onlyImages[0]) setSelectedId(onlyImages[0].id);
    })();
  }, []);

  const selected = assets.find((a) => a.id === selectedId);

  async function postNow() {
    setMsg(null);
    if (!selected) {
      setMsg("Pick an image.");
      return;
    }
    if (!igUserId || !accessToken) {
      setMsg("Enter IG User ID and Access Token.");
      return;
    }

    try {
      setPosting(true);
      const resp = await fetch("/api/ig/publish-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          igUserId,
          accessToken,
          imageUrl: selected.storagePath,
          caption,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Publish failed");
      setMsg(`Published! Media ID: ${json.publish?.id ?? "check Instagram"}`);
    } catch (e: any) {
      setMsg(e.message ?? "Failed to publish");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Compose</h1>

      <div className="grid grid-cols-3 gap-3 border rounded-xl p-3">
        {assets.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedId(a.id)}
            className={`border rounded-lg overflow-hidden ${selectedId === a.id ? "ring-2 ring-blue-500" : ""}`}
            title={a.storagePath}
          >
            <img
              src={a.storagePath}
              alt=""
              className="w-full h-32 object-cover"
            />
          </button>
        ))}
        {assets.length === 0 && (
          <p className="col-span-3 text-sm text-gray-600">
            No images yet. Go upload one in Library.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium">Caption</label>
        <textarea
          className="w-full border rounded-lg p-2"
          rows={4}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write something on-brand…"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">IG User ID</label>
          <input
            className="w-full border rounded-lg p-2"
            value={igUserId}
            onChange={(e) => setIgUserId(e.target.value)}
            placeholder="1784************"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Access Token</label>
          <input
            className="w-full border rounded-lg p-2"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAG..."
          />
        </div>
      </div>

      <button
        className="rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
        disabled={!selected || posting}
        onClick={postNow}
      >
        {posting ? "Publishing…" : "Post Now to Instagram"}
      </button>

      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
