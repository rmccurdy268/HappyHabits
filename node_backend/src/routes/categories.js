// routes/categories.js
import express from "express";
import { authenticateToken } from "../middleware/auth.js";

export default function createCategoriesRouter(service) {
  const router = express.Router();
  // GET /categories
  router.get("/", async (req, res) => {
    try {
      const categories = await service.getAllCategories();
      res.json(categories);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch categories" });
    }
  });

  // GET /categories/me - Get categories for current user (global + user's custom)
  // Uses auth middleware to extract user ID from token
  router.get("/me", authenticateToken, async (req, res) => {
    try {
      // req.user.id is set by authenticateToken middleware (auth user ID from JWT)
      const authUserId = req.user.id;

      // Get UserData record to get the user's ID
      const userData = await service.getUserByAuthId(authUserId);
      const userId = userData.id;

      // Get categories for user (global + user's custom categories)
      const categories = await service.getCategoriesForUser(userId);
      res.json(categories);
    } catch (error) {
      console.error("Error in /categories/me:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch user categories" });
    }
  });

  // GET /categories/:id
  router.get("/:id", async (req, res) => {
    try {
      const category = await service.getCategoryById(req.params.id);
      res.json(category);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to fetch category" });
    }
  });

  // POST /categories
  router.post("/", async (req, res) => {
    const { name, user_id } = req.body;

    try {
      const category = await service.createCategory({
        name,
        user_id,
      });
      res.json(category);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to create category" });
    }
  });

  // PATCH /categories/:id
  router.patch("/:id", async (req, res) => {
    const updates = req.body;

    try {
      const category = await service.updateCategory(req.params.id, updates);
      res.json(category);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to update category" });
    }
  });

  // DELETE /categories/:id
  router.delete("/:id", async (req, res) => {
    try {
      const result = await service.deleteCategory(req.params.id);
      res.json(result);
    } catch (err) {
      res
        .status(500)
        .json({ error: err.message || "Failed to delete category" });
    }
  });

  return router;
}
