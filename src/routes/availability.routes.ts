import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  createAvailabilityHandler,
  getMyAvailabilitiesHandler,
  getTeacherAvailabilitiesHandler,
  deleteAvailabilityHandler,
} from "../controllers/availability.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", createAvailabilityHandler);
router.get("/me", getMyAvailabilitiesHandler);
router.get("/teacher/:teacherId", getTeacherAvailabilitiesHandler);
router.delete("/:id", deleteAvailabilityHandler);

export default router;
