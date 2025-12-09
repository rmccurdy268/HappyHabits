// routes/logs.js
import express from "express";

export default function createLogsRouter(service) {
  const router = express.Router();
  // GET /user-habits/:habitId/logs
  router.get("/user-habits/:habitId/logs", async (req, res) => {
    try {
      const logs = await service.getHabitLogs(req.params.habitId);
      res.json(logs);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch habit logs" });
    }
  });

  // GET /user-habits/:habitId/logs/today
  router.get("/user-habits/:habitId/logs/today", async (req, res) => {
    try {
      const todayDate = req.query.date || null; // Optional date parameter (YYYY-MM-DD)
      const logs = await service.getTodayHabitLogs(
        req.params.habitId,
        todayDate
      );
      res.json(logs);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch today's habit logs" });
    }
  });

  // POST /user-habits/:habitId/logs
  router.post("/user-habits/:habitId/logs", async (req, res) => {
    const { date, notes, time_completed } = req.body;

    try {
      const log = await service.createHabitLog({
        user_habit_id: req.params.habitId,
        date,
        notes,
        time_completed,
      });
      res.json(log);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to create log" });
    }
  });

  // PATCH /habit-logs/:logId
  router.patch("/habit-logs/:logId", async (req, res) => {
    const updates = req.body;

    try {
      const log = await service.updateHabitLog(req.params.logId, updates);
      res.json(log);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to update log" });
    }
  });

  // DELETE /habit-logs/:logId
  router.delete("/habit-logs/:logId", async (req, res) => {
    try {
      const result = await service.deleteHabitLog(req.params.logId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to delete log" });
    }
  });

  // GET /users/:userId/logs/range
  router.get("/users/:userId/logs/range", async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          error:
            "start_date and end_date query parameters are required (YYYY-MM-DD format)",
        });
      }

      const logs = await service.getUserLogsForDateRange(
        req.params.userId,
        start_date,
        end_date
      );
      res.json(logs);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch logs for date range" });
    }
  });

  return router;
}
