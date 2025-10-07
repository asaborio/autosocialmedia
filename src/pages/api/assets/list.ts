import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.status(200).json(assets);
}
