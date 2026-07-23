import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../utils/prisma.js", () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

vi.mock("./credit.service.js", () => ({
  refundCredits: vi.fn(),
  releaseCredits: vi.fn(),
  holdCredits: vi.fn(),
}));

vi.mock("./reliability.service.js", () => ({
  addStrike: vi.fn(),
  isUserBlocked: vi.fn(),
}));

vi.mock("./conversation.service.js", () => ({
  findOrCreateConversation: vi.fn(),
}));

import prisma from "../utils/prisma.js";
import { refundCredits, releaseCredits } from "./credit.service.js";
import { addStrike } from "./reliability.service.js";
import { findOrCreateConversation } from "./conversation.service.js";
import {
  cancelBooking,
  isLateCancellation,
  rejectBooking,
  acceptBooking,
} from "./booking.service.js";

// ─── Helpers partagés ───────────────────────────────────────────────

const mockTx = {
  booking: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  availability: {
    update: vi.fn(),
  },
  session: {
    update: vi.fn(),
    create: vi.fn(),
  },
};

/** Configure le mock Prisma $transaction — réutilisé par tous les describe avec DB */
function setupPrismaTransactionMock() {
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
    callback(mockTx as never)
  );
  mockTx.booking.update.mockResolvedValue({});
  mockTx.availability.update.mockResolvedValue({});
  mockTx.session.update.mockResolvedValue({});
}

function buildBooking(startTimeUTC: Date, withSession = false) {
  return {
    id: "booking-1",
    studentId: "student-1",
    teacherId: "teacher-1",
    availabilityId: "availability-1",
    creditsAmount: 30,
    status: "CONFIRMED" as const,
    availability: {
      startTimeUTC,
      endTimeUTC: new Date(startTimeUTC.getTime() + 30 * 60 * 1000),
      durationMinutes: 30,
    },
    session: withSession ? { id: "session-1" } : null,
  };
}

/** rejectBooking ne charge pas availability — objet plus simple */
function buildPendingBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    studentId: "student-1",
    teacherId: "teacher-1",
    availabilityId: "availability-1",
    creditsAmount: 30,
    status: "PENDING" as const,
    ...overrides,
  };
}

// ─── isLateCancellation (fonction pure, zéro mock) ──────────────────

describe("isLateCancellation", () => {
  it("returns true when cancellation is less than 12 hours before start", () => {
    const startTimeUTC = new Date("2026-07-21T10:00:00Z");
    const now = new Date("2026-07-21T09:00:00Z");
    expect(isLateCancellation(startTimeUTC, now)).toBe(true);
  });

  it("returns false when cancellation is more than 12 hours before start", () => {
    const startTimeUTC = new Date("2026-07-21T20:00:00Z");
    const now = new Date("2026-07-21T06:00:00Z");
    expect(isLateCancellation(startTimeUTC, now)).toBe(false);
  });

  it("returns true when cancellation is exactly 12 hours before start", () => {
    const startTimeUTC = new Date("2026-07-21T22:00:00Z");
    const now = new Date("2026-07-21T10:00:00Z");
    expect(isLateCancellation(startTimeUTC, now)).toBe(true);
  });
});

// ─── cancelBooking ──────────────────────────────────────────────────

describe("cancelBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T10:00:00Z"));
    setupPrismaTransactionMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refunds credits on early cancellation (> 12h before start)", async () => {
    const booking = buildBooking(new Date("2026-07-22T10:00:00Z"));
    mockTx.booking.findUnique.mockResolvedValue(booking);

    const result = await cancelBooking("booking-1", "student-1");

    expect(refundCredits).toHaveBeenCalledWith("student-1", 30, "booking-1", mockTx);
    expect(releaseCredits).not.toHaveBeenCalled();
    expect(addStrike).not.toHaveBeenCalled();
    expect(mockTx.session.update).not.toHaveBeenCalled();
    expect(mockTx.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { status: "CANCELLED" },
    });
    expect(mockTx.availability.update).toHaveBeenCalledWith({
      where: { id: "availability-1" },
      data: { isBooked: false },
    });
    expect(result.status).toBe("CANCELLED");
  });

  it("releases credits and adds strike on late cancellation (<= 12h before start)", async () => {
    const booking = buildBooking(new Date("2026-07-21T20:00:00Z"), true);
    mockTx.booking.findUnique.mockResolvedValue(booking);

    const result = await cancelBooking("booking-1", "student-1");

    expect(releaseCredits).toHaveBeenCalledWith("teacher-1", 30, "booking-1", mockTx);
    expect(addStrike).toHaveBeenCalledWith("student-1", mockTx);
    expect(refundCredits).not.toHaveBeenCalled();
    expect(mockTx.availability.update).toHaveBeenCalledWith({
      where:  {id: "availability-1"},
      data: { isBooked: false},
    });
    expect(mockTx.booking.update).toHaveBeenCalledWith({
      where: {id: "booking-1"},
      data: {status: "CANCELLED"},
    });
    expect(mockTx.session.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { status: "CANCELLED" },
    });
    expect(result.status).toBe("CANCELLED");
  });

  it("throws when booking is not found", async () => {
    mockTx.booking.findUnique.mockResolvedValue(null);

    await expect(cancelBooking("booking-1", "student-1")).rejects.toThrow(
      "Booking not found"
    );

    expect(mockTx.booking.update).not.toHaveBeenCalled();
    expect(mockTx.session.update).not.toHaveBeenCalled();
    expect(mockTx.availability.update).not.toHaveBeenCalled();
    expect(refundCredits).not.toHaveBeenCalled();
    expect(releaseCredits).not.toHaveBeenCalled();
    expect(addStrike).not.toHaveBeenCalled();
  });
});


describe("rejectBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrismaTransactionMock();
  });

  it("refunds credits and marks availability as free", async () => {
    // Étape 1 — Arrange : ce que Prisma "retourne"
    mockTx.booking.findUnique.mockResolvedValue(buildPendingBooking());

    // Étape 2 — Act : appeler la fonction
    const result = await rejectBooking("booking-1", "teacher-1");

    // Étape 3 — Assert : vérifier les effets
    expect(mockTx.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { status: "REJECTED" },
    });
    expect(mockTx.availability.update).toHaveBeenCalledWith({
      where: { id: "availability-1" },
      data: { isBooked: false },
    });
    expect(refundCredits).toHaveBeenCalledWith("student-1", 30, "booking-1", mockTx);
    expect(result.status).toBe("REJECTED");
  });

  it("throws when booking is not found", async () => {
    mockTx.booking.findUnique.mockResolvedValue(null);

    await expect(rejectBooking("booking-1", "teacher-1")).rejects.toThrow(
      "Booking not found"
    );

    expect(mockTx.booking.update).not.toHaveBeenCalled();
    expect(mockTx.availability.update).not.toHaveBeenCalled();
    expect(refundCredits).not.toHaveBeenCalled();
  });

  it("throws when user is not the teacher", async () => {
    mockTx.booking.findUnique.mockResolvedValue(buildPendingBooking());

    await expect(rejectBooking("booking-1", "teacher-2")).rejects.toThrow(
      "Not authorized to reject this booking"
    );

    expect(refundCredits).not.toHaveBeenCalled();
  });
});

// ─── acceptBooking (exercice pour toi) ──────────────────────────────

describe("acceptBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrismaTransactionMock();
    mockTx.session.create.mockResolvedValue({ id: "session-1" });
  });

  it("creates a session and conversation on accept", async () => {
    // acceptBooking charge availability → il faut buildBooking, pas buildPendingBooking
    const booking = {
      ...buildBooking(new Date("2026-07-22T10:00:00Z")),
      status: "PENDING" as const,
    };
    mockTx.booking.findUnique.mockResolvedValue(booking);

    // expect() sert à VÉRIFIER, pas à appeler la fonction
    const result = await acceptBooking("booking-1", "teacher-1");

    expect(mockTx.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { status: "CONFIRMED" },
    });
    expect(mockTx.session.create).toHaveBeenCalled();
    expect(findOrCreateConversation).toHaveBeenCalledWith(
      "student-1",
      "teacher-1",
      mockTx
    );
    // acceptBooking retourne { booking, session } — pas result.status directement
    expect(result.booking.status).toBe("CONFIRMED");
  });
});
