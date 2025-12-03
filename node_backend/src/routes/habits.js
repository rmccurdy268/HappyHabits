// routes/habits.js
import express from "express";

export default function createHabitsRouter(service) {
  const router = express.Router();
  // GET /users/:id/habits
  router.get("/users/:id/habits", async (req, res) => {
    try {
      const habits = await service.getUserHabits(req.params.id);
      res.json(habits);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch user habits" });
    }
  });

  // POST /users/:id/habits
  router.post("/users/:id/habits", async (req, res) => {
    const {
      template_id,
      name,
      description,
      category_id,
      times_per_day,
      create_date,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    try {
      let finalCategoryId = category_id;

      // If creating from template and no category_id provided, get it from template
      if (template_id && !category_id) {
        const template = await service.getTemplateById(template_id);
        if (template && template.category_id) {
          finalCategoryId = template.category_id;
        }
      }

      // For custom habits (no template_id), category_id is required
      if (!template_id && !finalCategoryId) {
        return res
          .status(400)
          .json({ error: "Category is required for custom habits" });
      }

      const habit = await service.createUserHabit({
        user_id: req.params.id,
        template_id: template_id || null,
        name,
        description: description || "",
        category_id: finalCategoryId || null,
        times_per_day: times_per_day || 1, // Default to 1 if not provided
        create_date: create_date || null, // Use provided date or let DB default
      });
      res.json(habit);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to create user habit" });
    }
  });

  // GET /user-habits/:habitId
  router.get("/user-habits/:habitId", async (req, res) => {
    try {
      const habit = await service.getHabitById(req.params.habitId);
      res.json(habit);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to fetch habit" });
    }
  });

  // PATCH /user-habits/:habitId
  router.patch("/user-habits/:habitId", async (req, res) => {
    const updates = req.body;

    try {
      const habit = await service.updateHabit(req.params.habitId, updates);
      res.json(habit);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to update habit" });
    }
  });

  // PATCH /user-habits/:habitId/archive
  router.patch("/user-habits/:habitId/archive", async (req, res) => {
    try {
      const habit = await service.archiveHabit(req.params.habitId);
      res.json(habit);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to archive habit" });
    }
  });

  // DELETE /user-habits/:habitId
  router.delete("/user-habits/:habitId", async (req, res) => {
    try {
      const result = await service.deleteHabit(req.params.habitId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to delete habit" });
    }
  });

  return router;
}
