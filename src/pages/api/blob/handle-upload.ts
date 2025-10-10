import type { NextApiRequest, NextApiResponse } from "next";
import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const result = await handleUpload({
      request: req,
      body: req.body as HandleUploadBody,
      onBeforeGenerateToken: async () => {
        return {
          // Basic constraints; adjust as needed
          allowedContentTypes: ["image/*", "video/*"],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
          addRandomSuffix: true,
        };
      },
    });

    res.status(200).json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to handle upload";
    res.status(500).json({ error: message });
  }
}
