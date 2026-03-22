import { Request, Response } from "express";
import {
  getMySessions,
  getSession,
  startSession,
  endSession,
} from "../services/session.service.js";

export async function getMySessionsHandler(req: Request, res: Response) {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit
      ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
      : 20;
    const sessions = await getMySessions(req.userId!, cursor, limit);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSessionHandler(req: Request, res: Response) {
  try {
    const session = await getSession(req.params.id as string, req.userId!);
    res.json(session);
  } catch (error: any) {
    if (error.message === "Session not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to view this session") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message });
  }
}

export async function startSessionHandler(req: Request, res: Response) {
  try {
    const session = await startSession(req.params.id as string, req.userId!);
    res.json(session);
  } catch (error: any) {
    if (error.message === "Session not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to start this session") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}

export async function endSessionHandler(req: Request, res: Response) {
  try {
    const session = await endSession(req.params.id as string, req.userId!);
    res.json(session);
  } catch (error: any) {
    if (error.message === "Session not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to end this session") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}
