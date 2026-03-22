import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  createBookingHandler,
  getMyBookingsHandler,
  acceptBookingHandler,
  rejectBookingHandler,
  cancelBookingHandler,
} from "../controllers/booking.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", createBookingHandler);
router.get("/me", getMyBookingsHandler);
router.patch("/:id/accept", acceptBookingHandler);
router.patch("/:id/reject", rejectBookingHandler);
router.patch("/:id/cancel", cancelBookingHandler);

export default router;
