
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { requireAuth } = require("./middlewares/authMiddleware");

const authRoutes = require("./routes/authRoutes");
const readinessRoutes = require("./routes/readinessRoutes");
const learningRoutes = require("./routes/learningRoutes");
const rewardsRoutes = require("./routes/rewardsRoutes");
const bankingRoutes = require("./routes/bankingRoutes");
const paymentReviewRoutes = require("./routes/paymentReviewRoutes");
const scamRoutes = require("./routes/scamRoutes");

const { testIBMConnection } = require("./services/ibmService");

const app = express();

// Allowed frontend origins.
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins
}));

// Allow backend to receive JSON data.
app.use(express.json({ limit: "128kb" }));

// Limit AI requests per authenticated user.
const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many AI requests. Please try again in a minute."
  }
});

// Authentication routes.
app.use("/api/auth", authRoutes);

// Banking routes.
app.use("/api/banking", bankingRoutes);

// E-commerce payment-review routes.
app.use("/api/payment-review", paymentReviewRoutes);

// Existing backend homepage.
app.get("/", (req, res) => {
  res.send("OCBC Backend is running!");
});

// IBM diagnostic endpoints (development only).
if (process.env.NODE_ENV !== "production") {

  // Check IBM configuration.
  app.get("/api/ibm/status", (req, res) => {
    res.json({
      apiKeyConfigured: Boolean(process.env.IBM_API_KEY),
      projectIdConfigured: Boolean(process.env.IBM_PROJECT_ID),
      region: process.env.IBM_REGION || "Not configured",
      modelIdConfigured: Boolean(process.env.IBM_MODEL_ID)
    });
  });

  // Test IBM connection.
  app.get("/api/ibm/test", async (req, res) => {
    try {
      const result = await testIBMConnection();

      res.json({
        success: true,
        message: "IBM watsonx.ai connection successful!",
        response: result
      });

    } catch (error) {
      console.error("IBM test failed:", error.message);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

// Protected scam chatbot routes.
app.use("/api/scam", requireAuth, chatbotLimiter, scamRoutes);

// Existing learning, readiness and rewards routes.
app.use("/api/readiness", readinessRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/rewards", rewardsRoutes);

// Return JSON for unknown API routes.
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found."
  });
});

// Start Express server.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
