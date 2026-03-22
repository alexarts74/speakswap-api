import { Request, Response } from "express";
import { register, login } from "../services/auth.service.js";

export async function registerHandler(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName, nativeLanguage, learningLanguages } = req.body;

    if (!email || !password || !firstName || !lastName || !nativeLanguage) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const result = await register({
      email,
      password,
      firstName,
      lastName,
      nativeLanguage,
      learningLanguages: learningLanguages ?? [],
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === "Email already in use") {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await login(email, password);
    res.json(result);
  } catch (error: any) {
    if (error.message === "Invalid email or password") {
      res.status(401).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
}
