"use strict";

const express = require("express");

const {
  requireAuth,
} = require("../middlewares/authMiddleware");

const {
  getSavedReview,
  changeReview,
} = require("../controllers/paymentReviewController");

const {
  getRecipientPaymentHistory,
} = require("../services/paymentReviewRisk");

const router = express.Router();

// Require an authenticated Supabase session.
router.use(requireAuth);

// Never cache customer payment review information.
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Existing Sprint 1 saved-review endpoint.
router.get("/saved", getSavedReview);

// Sprint 2:
// Retrieve completed payments and cumulative totals.
router.post("/recipient-history", async (req, res) => {
  try {
    // Never trust a customer ID provided by the frontend.
    const userId = req.user.id;

    const history = await getRecipientPaymentHistory(
      userId,
      req.body
    );

    return res.status(200).json({
      history,
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        error: error.message,
      });
    }

    console.error(
      "[payment-review:recipient-history]",
      error.code || error.message
    );

    return res.status(503).json({
      error:
        "Unable to retrieve payment history. Please try again.",
    });
  }
});

// Preserve all existing Sprint 1 actions:
// assess, ack, summary, save, complete, confirm, cancel.
router.post("/:action", changeReview);

module.exports = router;