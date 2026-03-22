import prisma from "../utils/prisma.js";
import { releaseCredits, refundCredits } from "./credit.service.js";
import { addStrike } from "./reliability.service.js";

export async function getMySessions(userId: string, cursor?: string, limit: number = 20) {
  return prisma.session.findMany({
    where: {
      OR: [{ studentId: userId }, { teacherId: userId }],
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      teacher: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { scheduledStartUTC: "desc" },
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
  });
}

export async function getSession(sessionId: string, userId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      teacher: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      booking: { include: { availability: true } },
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.studentId !== userId && session.teacherId !== userId) {
    throw new Error("Not authorized to view this session");
  }

  return session;
}

export async function startSession(sessionId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.studentId !== userId && session.teacherId !== userId) {
      throw new Error("Not authorized to start this session");
    }

    if (session.status !== "SCHEDULED" && session.status !== "IN_PROGRESS") {
      throw new Error("Session cannot be started in its current status");
    }

    const now = new Date();
    const isTeacher = session.teacherId === userId;

    const data: { teacherStartedAt?: Date; studentStartedAt?: Date; status?: "IN_PROGRESS" } = {};

    if (isTeacher) {
      if (session.teacherStartedAt) {
        throw new Error("Teacher has already started this session");
      }
      data.teacherStartedAt = now;
    } else {
      if (session.studentStartedAt) {
        throw new Error("Student has already started this session");
      }
      data.studentStartedAt = now;
    }

    // Check if both have now started
    const otherStarted = isTeacher ? session.studentStartedAt : session.teacherStartedAt;
    if (otherStarted) {
      data.status = "IN_PROGRESS";
    }

    return tx.session.update({
      where: { id: sessionId },
      data,
    });
  });
}

export async function endSession(sessionId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.studentId !== userId && session.teacherId !== userId) {
      throw new Error("Not authorized to end this session");
    }

    if (session.status !== "IN_PROGRESS") {
      throw new Error("Session is not in progress");
    }

    await releaseCredits(session.teacherId, session.creditsAmount, sessionId, tx);

    return tx.session.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });
  });
}

export async function resolveNoShows() {
  const gracePeriod = new Date(Date.now() - 10 * 60 * 1000);

  const sessions = await prisma.session.findMany({
    where: {
      status: "SCHEDULED",
      scheduledStartUTC: { lt: gracePeriod },
    },
  });

  for (const session of sessions) {
    await prisma.$transaction(async (tx) => {
      if (session.studentStartedAt && !session.teacherStartedAt) {
        // Teacher no-show
        await tx.session.update({
          where: { id: session.id },
          data: { status: "NO_SHOW_TEACHER" },
        });
        await refundCredits(session.studentId, session.creditsAmount, session.id, tx);
        await addStrike(session.teacherId, tx);
      } else if (!session.studentStartedAt && session.teacherStartedAt) {
        // Student no-show
        await tx.session.update({
          where: { id: session.id },
          data: { status: "NO_SHOW_STUDENT" },
        });
        await releaseCredits(session.teacherId, session.creditsAmount, session.id, tx);
        await addStrike(session.studentId, tx);
      } else {
        // Both no-show
        await tx.session.update({
          where: { id: session.id },
          data: { status: "NO_SHOW_BOTH" },
        });
        await refundCredits(session.studentId, session.creditsAmount, session.id, tx);
        await addStrike(session.studentId, tx);
        await addStrike(session.teacherId, tx);
      }
    });
  }
}

export async function autoCompleteSessions() {
  const now = new Date();

  const sessions = await prisma.session.findMany({
    where: {
      status: "IN_PROGRESS",
      scheduledEndUTC: { lt: now },
    },
  });

  for (const session of sessions) {
    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED",
          endedAt: session.scheduledEndUTC,
        },
      });
      await releaseCredits(session.teacherId, session.creditsAmount, session.id, tx);
    });
  }
}
