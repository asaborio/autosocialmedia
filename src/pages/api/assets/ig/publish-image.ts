import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  try {
    const { igUserId, accessToken, imageUrl, caption } = req.body as {
      igUserId: string;
      accessToken: string;
      imageUrl: string;
      caption?: string;
    };
    if (!igUserId || !accessToken || !imageUrl) {
      return res
        .status(400)
        .json({ error: "igUserId, accessToken, imageUrl required" });
    }

    // 1) Create media container
    const containerResp = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    ).then((r) => r.json() as Promise<{ id?: string; error?: unknown }>);
    if (!containerResp.id)
      throw new Error(`Container error: ${JSON.stringify(containerResp)}`);

    // 2) Publish container
    const publishResp = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerResp.id,
          access_token: accessToken,
        }),
      }
    ).then((r) => r.json());

    res.status(200).json({ container: containerResp, publish: publishResp });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
