// routes/users.js
import express from "express";
import { authenticateToken } from "../middleware/auth.js";

export default function createUsersRouter(service) {
  const router = express.Router();

  // POST /users
  router.post("/", async (req, res) => {
    try {
      const { username, password, email, phone, preferred_contact_method } =
        req.body;

      const result = await service.createUser(email, password, {
        username,
        phone,
        preferred_contact_method,
      });

      if (result.success) {
        res.status(201).json({
          message: result.message || "User registered successfully",
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          user: result.user,
        });
      } else {
        res.status(400).json({ message: result.message });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /users/me - Get current user by JWT token (MUST come before /:id route)
  // Uses auth middleware to extract user ID from token
  router.get("/me", authenticateToken, async (req, res) => {
    try {
      // req.user.id is set by authenticateToken middleware (auth user ID from JWT)
      const authUserId = req.user.id;

      const user = await service.getUserByAuthId(authUserId);
      res.json(user);
    } catch (error) {
      // If user not found, it might be an old user without UserData record
      // Return a more helpful error message
      if (
        error.message.includes("not found") ||
        error.message.includes("User profile not found")
      ) {
        return res.status(404).json({
          error:
            "User profile not found. Please contact support or try logging out and back in.",
        });
      }
      console.error("Error in /users/me:", error);
      res.status(500).json({ error: error.message || "Failed to fetch user" });
    }
  });

  // GET /users/:id - Get user by UserData ID (must come after /me)
  router.get("/:id", async (req, res) => {
    try {
      const user = await service.getUserById(req.params.id);
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to fetch user" });
    }
  });

  // PATCH /users/:id
  router.patch("/:id", async (req, res) => {
    const updates = req.body;

    try {
      const user = await service.updateUser(req.params.id, updates);
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to update user" });
    }
  });

  // DELETE /users/:id
  router.delete("/:id", async (req, res) => {
    try {
      const result = await service.deleteUser(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to delete user" });
    }
  });

  return router;
}
