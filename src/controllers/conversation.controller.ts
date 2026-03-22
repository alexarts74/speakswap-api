import { Request, Response } from "express";
import {
  getUserConversations,
  createConversation,
  getConversationMessages,
  sendMessage,
  markAsRead,
} from "../services/conversation.service.js";

export async function getConversationsHandler(req: Request, res: Response) {
  try {
    const conversations = await getUserConversations(req.userId!);
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createConversationHandler(req: Request, res: Response) {
  try {
    const { userId: otherUserId } = req.body;

    if (!otherUserId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const conversation = await createConversation(req.userId!, otherUserId);
    res.status(201).json(conversation);
  } catch (error: any) {
    if (error.message === "User not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}

export async function getMessagesHandler(req: Request, res: Response) {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit
      ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
      : 50;

    const messages = await getConversationMessages(
      req.params.id as string,
      req.userId!,
      cursor,
      limit
    );
    res.json(messages);
  } catch (error: any) {
    if (error.message === "Conversation not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to view this conversation") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message });
  }
}

export async function markAsReadHandler(req: Request, res: Response) {
  try {
    const result = await markAsRead(req.params.id as string, req.userId!);
    res.json({ markedCount: result.count });
  } catch (error: any) {
    if (error.message === "Conversation not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to access this conversation") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message });
  }
}

export async function sendMessageHandler(req: Request, res: Response) {
  try {
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const message = await sendMessage(req.params.id as string, req.userId!, content);
    res.status(201).json(message);
  } catch (error: any) {
    if (error.message === "Conversation not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to send messages in this conversation") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}
