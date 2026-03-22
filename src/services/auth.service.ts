import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  nativeLanguage: string;
  learningLanguages: string[];
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new Error("Email already in use");
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
      nativeLanguage: input.nativeLanguage,
      learningLanguages: input.learningLanguages,
      credits: 60,
      creditTransactions: {
        create: {
          amount: 60,
          type: "BONUS",
        },
      },
    },
  });

  const token = generateToken(user.id);
  const { password: _, ...userWithoutPassword } = user;

  return { token, user: userWithoutPassword };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken(user.id);
  const { password: _, ...userWithoutPassword } = user;

  return { token, user: userWithoutPassword };
}

function generateToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
}
