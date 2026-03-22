import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  getConversationsHandler,
  createConversationHandler,
  getMessagesHandler,
  sendMessageHandler,
  markAsReadHandler,
} from "../controllers/conversation.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getConversationsHandler);
router.post("/", createConversationHandler);
router.get("/:id/messages", getMessagesHandler);
router.post("/:id/messages", sendMessageHandler);
router.patch("/:id/read", markAsReadHandler);

export default router;
