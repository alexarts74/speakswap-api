import { PrismaClient } from "@prisma/client";
import prisma from "../utils/prisma.js";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function holdCredits(
  userId: string,
  amount: number,
  relatedId: string,
  tx?: TxClient
) {
  const client = tx ?? prisma;

  const user = await client.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.credits < amount) {
    throw new Error("Insufficient credits");
  }

  await client.user.update({
    where: { id: userId },
    data: { credits: { decrement: amount } },
  });

  await client.creditTransaction.create({
    data: {
      userId,
      amount: -amount,
      type: "ESCROW_HOLD",
      relatedId,
    },
  });
}

export async function releaseCredits(
  teacherId: string,
  amount: number,
  relatedId: string,
  tx?: TxClient
) {
  const client = tx ?? prisma;

  await client.user.update({
    where: { id: teacherId },
    data: { credits: { increment: amount } },
  });

  await client.creditTransaction.create({
    data: {
      userId: teacherId,
      amount,
      type: "ESCROW_RELEASE",
      relatedId,
    },
  });
}

export async function refundCredits(
  studentId: string,
  amount: number,
  relatedId: string,
  tx?: TxClient
) {
  const client = tx ?? prisma;

  await client.user.update({
    where: { id: studentId },
    data: { credits: { increment: amount } },
  });

  await client.creditTransaction.create({
    data: {
      userId: studentId,
      amount,
      type: "ESCROW_REFUND",
      relatedId,
    },
  });
}
