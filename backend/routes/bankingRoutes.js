const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");

const {
  getOverview,
  getTransactionDetails,
} = require("../controllers/bankingController");

const router = express.Router();

// Every banking endpoint requires a verified Supabase session.
router.use(requireAuth);

// Avoid caching customer banking responses.
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.get("/overview", getOverview);

router.get(
  "/transactions/:transactionId",
  getTransactionDetails
);

module.exports = router;