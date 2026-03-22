import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { getMeHandler, updateMeHandler, getTeachersHandler, getUserHandler } from "../controllers/user.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", getMeHandler);
router.put("/me", updateMeHandler);
router.get("/teachers", getTeachersHandler);
router.get("/:id", getUserHandler);

export default router;
