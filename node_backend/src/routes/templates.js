// routes/templates.js
import express from "express";

export default function createTemplatesRouter(service) {
  const router = express.Router();
  // GET /habit-templates
  router.get("/", async (req, res) => {
    try {
      const templates = await service.getAllTemplates();
      res.json(templates);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch templates" });
    }
  });

  // GET /habit-templates/:id
  router.get("/:id", async (req, res) => {
    try {
      const template = await service.getTemplateById(req.params.id);
      res.json(template);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch template" });
    }
  });

  // POST /habit-templates
  router.post("/", async (req, res) => {
    const { name, description, category, default_frequency, times_per_day } =
      req.body;

    try {
      const template = await service.createTemplate({
        name,
        description,
        category,
        default_frequency,
        times_per_day,
      });
      res.json(template);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to create template" });
    }
  });

  // PATCH /habit-templates/:id
  router.patch("/:id", async (req, res) => {
    const updates = req.body;

    try {
      const template = await service.updateTemplate(req.params.id, updates);
      res.json(template);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to update template" });
    }
  });

  // DELETE /habit-templates/:id
  router.delete("/:id", async (req, res) => {
    try {
      const result = await service.deleteTemplate(req.params.id);
      res.json(result);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to delete template" });
    }
  });

  return router;
}
