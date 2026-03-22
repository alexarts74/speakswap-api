import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { sendMessage } from "../services/conversation.service.js";
import prisma from "../utils/prisma.js";

interface JwtPayload {
  userId: string;
}

export function initializeChatSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    console.log(`Socket connected: ${socket.id} (user: ${userId})`);

    socket.on("join_conversation", async (conversationId: string) => {
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) return;
        if (conversation.user1Id !== userId && conversation.user2Id !== userId) return;

        socket.join(conversationId);
      } catch (error) {
        console.error("Error joining conversation:", error);
      }
    });

    socket.on(
      "send_message",
      async (data: { conversationId: string; content: string }) => {
        try {
          const message = await sendMessage(
            data.conversationId,
            userId,
            data.content
          );

          io.to(data.conversationId).emit("new_message", message);
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    socket.on("typing", (conversationId: string) => {
      socket.to(conversationId).emit("typing", { userId });
    });

    socket.on("stop_typing", (conversationId: string) => {
      socket.to(conversationId).emit("stop_typing", { userId });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
