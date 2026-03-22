import { PrismaClient } from "@prisma/client";
import prisma from "../utils/prisma.js";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function addStrike(userId: string, tx?: TxClient) {
  const client = tx ?? prisma;

  const user = await client.user.findUniqueOrThrow({ where: { id: userId } });

  const newStrikeCount = user.strikeCount + 1;
  const newScore = Math.max(0, user.reliabilityScore - 10);

  const data: { strikeCount: number; reliabilityScore: number; blockedUntil?: Date } = {
    strikeCount: newStrikeCount,
    reliabilityScore: newScore,
  };

  if (newStrikeCount >= 3) {
    const blockedUntil = new Date();
    blockedUntil.setDate(blockedUntil.getDate() + 7);
    data.blockedUntil = blockedUntil;
  }

  await client.user.update({ where: { id: userId }, data });
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.strikeCount >= 3 && user.blockedUntil && user.blockedUntil > new Date()) {
    return true;
  }

  return false;
}
