import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import availabilityRoutes from "./routes/availability.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import { initializeChatSocket } from "./socket/chat.js";
import { startSessionJobs } from "./jobs/sessionJobs.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/availabilities", availabilityRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/conversations", conversationRoutes);

initializeChatSocket(io);
startSessionJobs();

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, server, io };
