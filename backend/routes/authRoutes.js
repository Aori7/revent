const express = require("express");
const router = express.Router();
const { rateLimit } = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Too many login attempts. Please try again later."
    }
});
const { register } = require("../controllers/authController");
const { login } = require("../controllers/authController");
const { logout } = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    user: req.user
  });
});

module.exports = router;