const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3000;

// CORS configuration
// In development, allow all origins. In production, specify allowed origins.
app.use(
  cors({
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // credentials: true, // Uncomment if you need to send cookies/credentials
    // If using credentials, you must specify exact origins, e.g.:
    // origin: ["http://localhost:19006", "http://192.168.1.100:19006"]
  })
);

// Middleware to parse JSON
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Example API route
app.get("/api/data", (req, res) => {
  res.json({ message: "This is data from the backend!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
