import prisma from "../utils/prisma.js";

const userSelectWithoutPassword = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  nativeLanguage: true,
  learningLanguages: true,
  bio: true,
  avatarUrl: true,
  age: true,
  hobbies: true,
  roleMode: true,
  credits: true,
  reliabilityScore: true,
  strikeCount: true,
  blockedUntil: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userSelectWithoutPassword,
  });
}

interface UpdateProfileInput {
  bio?: string;
  age?: number;
  hobbies?: string[];
  avatarUrl?: string;
  learningLanguages?: string[];
  roleMode?: string;
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  if (data.roleMode !== undefined && data.roleMode !== "learner" && data.roleMode !== "teacher") {
    throw new Error("roleMode must be 'learner' or 'teacher'");
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: userSelectWithoutPassword,
  });
}

interface TeacherSearchFilters {
  language?: string;
  minAge?: number;
  maxAge?: number;
  hobbies?: string[];
}

export async function getPublicProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nativeLanguage: true,
      learningLanguages: true,
      bio: true,
      avatarUrl: true,
      age: true,
      hobbies: true,
      reliabilityScore: true,
    },
  });
}

export async function searchTeachers(filters: TeacherSearchFilters, cursor?: string, limit: number = 20) {
  const where: any = {
    roleMode: "teacher",
  };

  if (filters.language) {
    where.nativeLanguage = filters.language;
  }

  if (filters.minAge !== undefined || filters.maxAge !== undefined) {
    where.age = {};
    if (filters.minAge !== undefined) where.age.gte = filters.minAge;
    if (filters.maxAge !== undefined) where.age.lte = filters.maxAge;
  }

  if (filters.hobbies && filters.hobbies.length > 0) {
    where.hobbies = { hasSome: filters.hobbies };
  }

  return prisma.user.findMany({
    where,
    select: userSelectWithoutPassword,
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
  });
}
