import { demoTransactions } from "../data/demoBanking.js";

export const FIRST_RECIPIENT_THRESHOLD = 500;
export const ASSESSMENT_VERSION = 2;

function normalise(value) {
  return String(value ?? "").replace(/[\s-]/g, "");
}

export function hasCompletedOutgoingPayment(
  transaction,
  history
) {
  return history.some(
    (item) =>
      item.customerId === transaction.customerId &&
      item.status === "Completed" &&
      Number(item.amount) < 0 &&
      normalise(item.counterpartyNumber) ===
        normalise(transaction.recipientNumber)
  );
}

export function assessTransactionRisk(
  transaction,
  context = {}
) {
  const amount = Number(transaction.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid payment amount.");
  }

  let isNewRecipient =
    context.isNewRecipient === true;

  let restriction = "";

  const hasServerHistory =
    typeof context.serverIsNewRecipient === "boolean";

  // PBI-34: Prioritise actual Supabase history.
  if (hasServerHistory) {
    isNewRecipient = context.serverIsNewRecipient;
  }

  if (transaction.customerId) {
    // Preserve local simulation behaviour for existing
    // payment forms before backend assessment.
    if (!hasServerHistory) {
      const raw = localStorage.getItem(
        "reventTransactionHistory"
      );

      const saved = raw ? JSON.parse(raw) : [];

      if (
        !Array.isArray(saved) ||
        saved.some(
          (item) => !item || typeof item !== "object"
        )
      ) {
        throw new Error(
          "Payment history is unavailable. Please try again."
        );
      }

      isNewRecipient =
        !hasCompletedOutgoingPayment(transaction, [
          ...saved,
          ...demoTransactions,
        ]);
    }

    restriction =
      sessionStorage.getItem(
        "revent.demo.paymentRestriction"
      ) || "";
  }

  // PBI-34: Exact first-time recipient condition.
  const firstTimeRecipient =
    isNewRecipient &&
    amount >= FIRST_RECIPIENT_THRESHOLD;

  let score = 0;
  const reasons = [];

  function addRisk(condition, points, reason) {
    if (condition) {
      score += points;
      reasons.push(reason);
    }
  }

  addRisk(
    isNewRecipient,
    20,
    "Payment to a new recipient"
  );

  addRisk(
    firstTimeRecipient,
    10,
    `First payment to this recipient of SGD ${FIRST_RECIPIENT_THRESHOLD} or more`
  );

  addRisk(
    amount > 1000,
    20,
    "Large transaction amount"
  );

  addRisk(
    context.hasScamReports === true ||
      context.reportedRecipient === true,
    40,
    "Recipient has reported scam activity"
  );

  addRisk(
    context.isUnfamiliarDevice === true,
    15,
    "Payment initiated from an unfamiliar device"
  );

  addRisk(
    context.isScreenSharing === true,
    25,
    "Screen sharing active during payment"
  );

  addRisk(
    context.hasRapidTransfers === true,
    15,
    "Multiple transfers in a short period"
  );

  // Existing on-call interruption remains
  // in PaymentConfirmation.jsx.
  score = Math.min(score, 100);

  const level =
    score >= 60
      ? "high"
      : score >= 30
        ? "medium"
        : "low";

  return {
    assessmentVersion: ASSESSMENT_VERSION,

    score,
    level,
    reasons,

    requiresSafetyReview:
      level === "high",

    requiresReview:
      level !== "low",

    conditions: {
      firstTimeRecipient,
    },

    canProceedToConfirmation:
      !restriction &&
      context.canProceedToConfirmation !== false,

    restrictionReason:
      restriction ||
      (
        context.canProceedToConfirmation === false
          ? "This payment cannot proceed yet."
          : ""
      ),

    // Retain recipient-specific signals
    // during later reassessment.
    recipientContext: {
      reportedRecipient:
        context.reportedRecipient === true,

      ...(hasServerHistory
        ? {
            serverIsNewRecipient:
              context.serverIsNewRecipient,
          }
        : {}),
    },
  };
}