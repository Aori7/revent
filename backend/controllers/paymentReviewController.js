"use strict";

const supabase = require("../config/supabaseAdmin");

const {
  parsedReview,
  validatedAnswers,
  hasSeriousWarning,
} = require("../services/paymentReviewValidation");

const {
  assessServerPaymentRisk,
} = require("../services/paymentReviewRisk");

const ACTIONS = new Set([
  "assess",
  "ack",
  "summary",
  "save",
  "complete",
  "confirm",
  "cancel",
]);

// Preserve existing server-detected payment restrictions.
async function persistRiskBlock(userId, id, version) {
  const { error } = await supabase
    .from("revent_review_state")
    .update({
      blocked: true,
      state: "OPEN",
      acknowledged: false,
    })
    .eq("user_id", userId)
    .eq("client_id", id)
    .eq("version", version);

  if (error) {
    console.error(
      "[payment-review:block]",
      error.code || error.message
    );

    const failure = new Error(
      "Unable to store payment restriction."
    );

    failure.status = 503;

    throw failure;
  }
}

// GET /api/payment-review/saved
async function getSavedReview(req, res) {
  try {
    const { data, error } = await supabase
      .from("revent_review_state")
      .select("client_id,version,payment,answers")
      .eq("user_id", req.user.id)
      .eq("state", "SAVED")
      .order("updated_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.json({
        saved: null,
      });
    }

    return res.json({
      saved: {
        draft: {
          ...data.payment,
          id: data.client_id,
          version: data.version,
          customerId: req.user.id,
        },

        // Includes payment purpose and personalised answers.
        answers: data.answers ?? {},
      },
    });

  } catch (error) {
    console.error(
      "[payment-review:saved]",
      error.code || error.message
    );

    return res.status(503).json({
      error:
        "Unable to retrieve your saved review. Please try again.",
    });
  }
}

// POST /api/payment-review/:action
async function changeReview(req, res) {
  const action = req.params.action;

  if (!ACTIONS.has(action)) {
    return res.status(404).json({
      error: "Unknown review action.",
    });
  }

  try {
    const {
      id,
      version,
      payment,
    } = parsedReview(req.body);

    const needsAnswers = [
      "summary",
      "save",
      "complete",
    ].includes(action);

    let risk = null;

    // Retrieve trusted risk conditions for the
    // personalised questionnaire.
    if (
      [
        "assess",
        "summary",
        "save",
        "complete",
        "confirm",
      ].includes(action)
    ) {
      risk = await assessServerPaymentRisk(
        req.user.id,
        payment
      );

      // Preserve restrictions on completing a payment.
      // Users may still save and review a blocked payment.
      if (
        risk.blocked &&
        ["complete", "confirm"].includes(action)
      ) {
        await persistRiskBlock(
          req.user.id,
          id,
          version
        );

        return res.status(422).json({
          error: risk.reason,
        });
      }
    }

    const reviewContext = {
      firstTimeRecipient:
        risk?.firstTimeRecipient === true,

      largeAmount:
        Number(payment.amount) > 1000,
    };

    // Validate category and risk-specific answers.
    const answers = needsAnswers
      ? validatedAnswers(
          req.body.answers ?? {},
          action !== "save",
          reviewContext
        )
      : {};

    // Prevent completion with serious warning signs.
    if (
      action === "complete" &&
      hasSeriousWarning(answers)
    ) {
      return res.status(422).json({
        error:
          "Verify the payment before proceeding.",
      });
    }

    // Preserve existing Sprint 2 transaction recording.
    if (action === "confirm") {
      // Existing guided review authorisation.
      if (risk?.requiresReview) {
        const { error: reviewError } =
          await supabase.rpc(
            "revent_review_transition",
            {
              p_user: req.user.id,
              p_client: id,
              p_version: version,
              p_payment: payment,
              p_action: "confirm",
              p_answers: {},
            }
          );

        if (reviewError) {
          if (reviewError.code === "P0001") {
            return res.status(409).json({
              error: reviewError.message,
            });
          }

          return res.status(503).json({
            error: "Unable to authorise payment.",
          });
        }
      }

      // Existing atomic payment and balance update.
      const { data, error } = await supabase.rpc(
        "revent_confirm_ecommerce_payment",
        {
          p_user: req.user.id,
          p_client: id,
          p_version: version,
          p_payment: payment,
        }
      );

      if (error) {
        console.error(
          "[payment-confirmation]",
          error.code || error.message
        );

        if (error.code === "P0001") {
          return res.status(409).json({
            error: error.message,
          });
        }

        return res.status(503).json({
          error:
            "Unable to complete payment. Please try again.",
        });
      }

      return res.json(data);
    }

    // Preserve existing transaction-safe review RPC.
    const { data, error } = await supabase.rpc(
      "revent_review_transition",
      {
        p_user: req.user.id,
        p_client: id,
        p_version: version,
        p_payment: payment,
        p_action: action,
        p_answers: answers,
      }
    );

    if (error) {
      console.error(
        `[payment-review:${action}]`,
        error.code || error.message
      );

      if (
        [
          "P0001",
          "23505",
          "23514",
          "23503",
        ].includes(error.code)
      ) {
        return res.status(409).json({
          error:
            "Your payment review is no longer current. Please reopen it.",
        });
      }

      return res.status(503).json({
        error:
          "Unable to update the payment review. Please try again.",
      });
    }

    // Preserve server-side risk blocking during assessment.
    if (
      risk?.blocked &&
      action === "assess"
    ) {
      await persistRiskBlock(
        req.user.id,
        id,
        version
      );

      return res.json({
        ...data,
        state: "OPEN",
        acknowledged: false,
        blocked: true,
        risk,
      });
    }

    return res.json(
      risk
        ? { ...data, risk }
        : data
    );

  } catch (error) {
    if (
      error.status === 400 ||
      error.status === 422 ||
      error.status === 503
    ) {
      return res.status(error.status).json({
        error: error.message,
      });
    }

    console.error(
      `[payment-review:${action}]`,
      error.code || error.message
    );

    return res.status(500).json({
      error:
        "Unable to process your payment review.",
    });
  }
}

module.exports = {
  getSavedReview,
  changeReview,
};