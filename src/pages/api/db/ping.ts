import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  await prisma.$queryRaw`SELECT 1`;
  res.status(200).json({ ok: true });
}
