import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  try {
    const {
      userId = "demo-user",
      storagePath,
      kind,
    } = req.body as {
      userId?: string;
      storagePath: string;
      kind: "image" | "video";
    };
    if (!storagePath)
      return res.status(400).json({ error: "storagePath required" });

    const row = await prisma.mediaAsset.create({
      data: { userId, storagePath, kind },
    });
    res.status(200).json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
