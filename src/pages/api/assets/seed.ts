import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const row = await prisma.mediaAsset.create({
    data: {
      userId: "demo-user",
      storagePath: "https://example.com/demo.jpg",
      kind: "image",
    },
  });
  res.status(200).json(row);
}
