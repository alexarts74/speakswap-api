import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  getMySessionsHandler,
  getSessionHandler,
  startSessionHandler,
  endSessionHandler,
} from "../controllers/session.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", getMySessionsHandler);
router.get("/:id", getSessionHandler);
router.patch("/:id/start", startSessionHandler);
router.patch("/:id/end", endSessionHandler);

export default router;
