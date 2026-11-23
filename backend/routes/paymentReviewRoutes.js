
"use strict";

const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");

const {
  getSavedReview,
  changeReview,
} = require("../controllers/paymentReviewController");

const router = express.Router();

// Require a valid Supabase session for every endpoint.
router.use(requireAuth);

// Never cache payment review responses.
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Retrieve most recently saved review.
router.get("/saved", getSavedReview);

// Valid actions:
// assess, ack, summary, save, complete, confirm, cancel
router.post("/:action", changeReview);

module.exports = router;
