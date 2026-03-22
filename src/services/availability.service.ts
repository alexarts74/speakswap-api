import prisma from "../utils/prisma.js";

interface CreateAvailabilityInput {
  teacherId: string;
  startTimeUTC: string;
  endTimeUTC: string;
}

export async function createAvailability(input: CreateAvailabilityInput) {
  const { teacherId, startTimeUTC, endTimeUTC } = input;

  const start = new Date(startTimeUTC);
  const end = new Date(endTimeUTC);

  if (start >= end) {
    throw new Error("Start time must be before end time");
  }

  if (start <= new Date()) {
    throw new Error("Availability must be in the future");
  }

  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const creditsAmount = durationMinutes;

  const overlapping = await prisma.availability.findFirst({
    where: {
      teacherId,
      startTimeUTC: { lt: end },
      endTimeUTC: { gt: start },
    },
  });

  if (overlapping) {
    throw new Error("This slot overlaps with an existing availability");
  }

  return prisma.availability.create({
    data: {
      teacherId,
      startTimeUTC: start,
      endTimeUTC: end,
      durationMinutes,
      creditsAmount,
    },
  });
}

export async function getMyAvailabilities(teacherId: string) {
  return prisma.availability.findMany({
    where: { teacherId },
    orderBy: { startTimeUTC: "asc" },
  });
}

export async function getTeacherAvailabilities(teacherId: string) {
  return prisma.availability.findMany({
    where: {
      teacherId,
      isBooked: false,
      startTimeUTC: { gt: new Date() },
    },
    orderBy: { startTimeUTC: "asc" },
  });
}

export async function deleteAvailability(availabilityId: string, userId: string) {
  const availability = await prisma.availability.findUnique({
    where: { id: availabilityId },
  });

  if (!availability) {
    throw new Error("Availability not found");
  }

  if (availability.teacherId !== userId) {
    throw new Error("Not authorized to delete this availability");
  }

  if (availability.isBooked) {
    throw new Error("Cannot delete a booked availability");
  }

  return prisma.availability.delete({ where: { id: availabilityId } });
}
