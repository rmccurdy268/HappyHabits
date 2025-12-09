import express from "express";
import cors from "cors";
const app = express();
const PORT = 3000;
import supabase from "./src/db/supabase.js";
import Service from "./src/service.js";
import createUsersRouter from "./src/routes/users.js";
import createTemplatesRouter from "./src/routes/templates.js";
import createHabitsRouter from "./src/routes/habits.js";
import createLogsRouter from "./src/routes/logs.js";
import createCategoriesRouter from "./src/routes/categories.js";

const service = new Service(supabase);

// CORS configuration
// In development, allow all origins. In production, specify allowed origins.
app.use(
  cors({
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Uncomment if you need to send cookies/credentials
    // If using credentials, you must specify exact origins, e.g.:
    // origin: ["http://localhost:19006", "http://192.168.1.100:19006"]
  })
);

// Middleware to parse JSON
app.use(express.json());

// API Routes
app.use("/api/users", createUsersRouter(service));
app.use("/api/habit-templates", createTemplatesRouter(service));
app.use("/api", createHabitsRouter(service));
app.use("/api", createLogsRouter(service));
app.use("/api/categories", createCategoriesRouter(service));

// Test route
app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Example login route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await service.login(email, password);

    if (result.success) {
      res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
        user: result.user,
      });
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Example refresh token route
app.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await service.refreshToken(refreshToken);

    if (result.success) {
      res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
        user: result.user,
      });
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Example protected route with token verification
app.get("/api/protected", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1]; // Bearer <token>
    const result = await service.verifyToken(token);

    if (result.success) {
      res.json({ message: "Protected data", user: result.user });
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await service.logout(refreshToken);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});
