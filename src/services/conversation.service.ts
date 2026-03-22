import { PrismaClient } from "@prisma/client";
import prisma from "../utils/prisma.js";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function findOrCreateConversation(
  userAId: string,
  userBId: string,
  tx?: TxClient
) {
  const client = tx ?? prisma;

  // Sort IDs lexicographically for the @@unique constraint
  const [user1Id, user2Id] = [userAId, userBId].sort();

  const existing = await client.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
  });

  if (existing) return existing;

  return client.conversation.create({
    data: { user1Id, user2Id },
  });
}

export async function getUserConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      user2: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          messages: {
            where: {
              senderId: { not: userId },
              readAt: null,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return conversations;
}

export async function createConversation(currentUserId: string, otherUserId: string) {
  if (currentUserId === otherUserId) {
    throw new Error("Cannot create conversation with yourself");
  }

  const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });
  if (!otherUser) {
    throw new Error("User not found");
  }

  return findOrCreateConversation(currentUserId, otherUserId);
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
  cursor?: string,
  limit: number = 50
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    throw new Error("Not authorized to view this conversation");
  }

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });
}

export async function markAsRead(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    throw new Error("Not authorized to access this conversation");
  }

  return prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.user1Id !== senderId && conversation.user2Id !== senderId) {
    throw new Error("Not authorized to send messages in this conversation");
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}
