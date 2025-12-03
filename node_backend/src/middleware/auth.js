// middleware/auth.js
import supabase from "../db/supabase.js";

/**
 * Authentication middleware
 * Verifies JWT token and extracts user information
 * Attaches user to req.user for use in route handlers
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ error: "No authorization header provided" });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify token and get user from Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach user information to request object
    req.user = {
      id: data.user.id, // This is the auth user ID (UUID)
      email: data.user.email,
      ...data.user,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};
