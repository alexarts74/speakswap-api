import prisma from "../utils/prisma.js";
import { holdCredits, refundCredits, releaseCredits } from "./credit.service.js";
import { addStrike, isUserBlocked } from "./reliability.service.js";
import { findOrCreateConversation } from "./conversation.service.js";

export async function createBooking(studentId: string, availabilityId: string) {
  return prisma.$transaction(async (tx) => {
    const availability = await tx.availability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability) {
      throw new Error("Availability not found");
    }

    if (availability.isBooked) {
      throw new Error("This slot is already booked");
    }

    if (availability.startTimeUTC <= new Date()) {
      throw new Error("Cannot book a slot in the past");
    }

    if (studentId === availability.teacherId) {
      throw new Error("Cannot book your own availability");
    }

    const blocked = await isUserBlocked(studentId);
    if (blocked) {
      throw new Error("Your account is temporarily blocked due to strikes");
    }

    const booking = await tx.booking.create({
      data: {
        studentId,
        teacherId: availability.teacherId,
        availabilityId,
        creditsAmount: availability.creditsAmount,
        status: "PENDING",
      },
    });

    await holdCredits(studentId, availability.creditsAmount, booking.id, tx);

    await tx.availability.update({
      where: { id: availabilityId },
      data: { isBooked: true },
    });

    return booking;
  });
}

export async function getMyBookings(userId: string, cursor?: string, limit: number = 20) {
  return prisma.booking.findMany({
    where: {
      OR: [{ studentId: userId }, { teacherId: userId }],
    },
    include: {
      availability: true,
      student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      teacher: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
  });
}

export async function acceptBooking(bookingId: string, teacherId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { availability: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.teacherId !== teacherId) {
      throw new Error("Not authorized to accept this booking");
    }

    if (booking.status !== "PENDING") {
      throw new Error("Booking is not in PENDING status");
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });

    const session = await tx.session.create({
      data: {
        bookingId,
        studentId: booking.studentId,
        teacherId: booking.teacherId,
        scheduledStartUTC: booking.availability.startTimeUTC,
        scheduledEndUTC: booking.availability.endTimeUTC,
        durationMinutes: booking.availability.durationMinutes,
        creditsAmount: booking.creditsAmount,
        status: "SCHEDULED",
      },
    });

    await findOrCreateConversation(booking.studentId, booking.teacherId, tx);

    return { booking: { ...booking, status: "CONFIRMED" }, session };
  });
}

export async function rejectBooking(bookingId: string, teacherId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.teacherId !== teacherId) {
      throw new Error("Not authorized to reject this booking");
    }

    if (booking.status !== "PENDING") {
      throw new Error("Booking is not in PENDING status");
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "REJECTED" },
    });

    await refundCredits(booking.studentId, booking.creditsAmount, bookingId, tx);

    await tx.availability.update({
      where: { id: booking.availabilityId },
      data: { isBooked: false },
    });

    return { ...booking, status: "REJECTED" };
  });
}

export async function cancelBooking(bookingId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { availability: true, session: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.studentId !== userId && booking.teacherId !== userId) {
      throw new Error("Not authorized to cancel this booking");
    }

    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      throw new Error("Booking cannot be cancelled in its current status");
    }

    const hoursUntilStart =
      (booking.availability.startTimeUTC.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilStart > 12) {
      // Free cancellation
      await refundCredits(booking.studentId, booking.creditsAmount, bookingId, tx);
    } else {
      // Late cancellation — no refund, credits go to teacher, strike the canceller
      await releaseCredits(booking.teacherId, booking.creditsAmount, bookingId, tx);
      await addStrike(userId, tx);
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    await tx.availability.update({
      where: { id: booking.availabilityId },
      data: { isBooked: false },
    });

    if (booking.session) {
      await tx.session.update({
        where: { id: booking.session.id },
        data: { status: "CANCELLED" },
      });
    }

    return { ...booking, status: "CANCELLED" };
  });
}
