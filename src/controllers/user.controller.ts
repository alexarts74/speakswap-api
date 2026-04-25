import { Request, Response } from "express";
import { getProfile, updateProfile, searchTeachers, getPublicProfile } from "../services/user.service.js";

export async function getMeHandler(req: Request, res: Response) {
  try {
    const user = await getProfile(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateMeHandler(req: Request, res: Response) {
  try {
    const { bio, age, hobbies, avatarUrl, learningLanguages, roleMode } = req.body;
    const user = await updateProfile(req.userId!, {
      bio,
      age,
      hobbies,
      avatarUrl,
      learningLanguages,
      roleMode,
    });
    res.json(user);
  } catch (error: any) {
    if (error.message === "roleMode must be 'learner' or 'teacher'") {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserHandler(req: Request, res: Response) {
  try {
    const user = await getPublicProfile(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTeachersHandler(req: Request, res: Response) {
  try {
    const { language, minAge, maxAge, hobbies, cursor } = req.query;
    const limit = req.query.limit
      ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
      : 20;
    const teachers = await searchTeachers(
      {
        language: language as string | undefined,
        minAge: minAge ? parseInt(minAge as string, 10) : undefined,
        maxAge: maxAge ? parseInt(maxAge as string, 10) : undefined,
        hobbies: hobbies ? (hobbies as string).split(",") : undefined,
      },
      cursor as string | undefined,
      limit
    );
    res.json(teachers);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}
