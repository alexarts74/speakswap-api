import { resolveNoShows, autoCompleteSessions } from "../services/session.service.js";

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startSessionJobs() {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try {
      await resolveNoShows();
    } catch (error) {
      console.error("Error resolving no-shows:", error);
    }

    try {
      await autoCompleteSessions();
    } catch (error) {
      console.error("Error auto-completing sessions:", error);
    }
  }, 60_000);

  console.log("Session jobs started (running every 60s)");
}

export function stopSessionJobs() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
