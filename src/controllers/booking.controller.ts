import { Request, Response } from "express";
import {
  createBooking,
  getMyBookings,
  acceptBooking,
  rejectBooking,
  cancelBooking,
} from "../services/booking.service.js";

export async function createBookingHandler(req: Request, res: Response) {
  try {
    const { availabilityId } = req.body;

    if (!availabilityId) {
      res.status(400).json({ error: "availabilityId is required" });
      return;
    }

    const booking = await createBooking(req.userId!, availabilityId);
    res.status(201).json(booking);
  } catch (error: any) {
    if (error.message === "Insufficient credits") {
      res.status(402).json({ error: error.message });
      return;
    }
    if (error.message === "This slot is already booked") {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error.message === "Availability not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}

export async function getMyBookingsHandler(req: Request, res: Response) {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit
      ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
      : 20;
    const bookings = await getMyBookings(req.userId!, cursor, limit);
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function acceptBookingHandler(req: Request, res: Response) {
  try {
    const result = await acceptBooking(req.params.id as string, req.userId!);
    res.json(result);
  } catch (error: any) {
    if (error.message === "Booking not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to accept this booking") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}

export async function rejectBookingHandler(req: Request, res: Response) {
  try {
    const result = await rejectBooking(req.params.id as string, req.userId!);
    res.json(result);
  } catch (error: any) {
    if (error.message === "Booking not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to reject this booking") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}

export async function cancelBookingHandler(req: Request, res: Response) {
  try {
    const result = await cancelBooking(req.params.id as string, req.userId!);
    res.json(result);
  } catch (error: any) {
    if (error.message === "Booking not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === "Not authorized to cancel this booking") {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message });
  }
}
