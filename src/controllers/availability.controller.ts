import { Request, Response } from "express";
import {
  createAvailability,
  getMyAvailabilities,
  getTeacherAvailabilities,
  deleteAvailability,
} from "../services/availability.service.js";

export async function createAvailabilityHandler(req: Request, res: Response) {
  try {
    const { startTimeUTC, endTimeUTC } = req.body;

    if (!startTimeUTC || !endTimeUTC) {
      res.status(400).json({ error: "startTimeUTC and endTimeUTC are required" });
      return;
    }

    const availability = await createAvailability({
      teacherId: req.userId!,
      startTimeUTC,
      endTimeUTC,
    });

    res.status(201).json(availability);
  } catch (error: any) {
    if (error.message === "This slot overlaps with an existing availability") {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}

export async function getMyAvailabilitiesHandler(req: Request, res: Response) {
  try {
    const availabilities = await getMyAvailabilities(req.userId!);
    res.json(availabilities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getTeacherAvailabilitiesHandler(req: Request, res: Response) {
  try {
    const availabilities = await getTeacherAvailabilities(req.params.teacherId as string);
    res.json(availabilities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteAvailabilityHandler(req: Request, res: Response) {
  try {
    await deleteAvailability(req.params.id as string, req.userId!);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === "Availability not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to delete this availability") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}
