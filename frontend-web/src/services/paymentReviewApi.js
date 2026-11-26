const BASE_URL =
  "http://localhost:3000/api/payment-review";

async function requestReview(path, payload) {
  const token = sessionStorage.getItem(
    "reventAccessToken"
  );

  if (!token) {
    throw new Error(
      "Please log in to continue your payment review."
    );
  }

  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method:
        payload === undefined ? "GET" : "POST",

      headers: {
        Authorization: `Bearer ${token}`,

        ...(payload === undefined
          ? {}
          : {
              "Content-Type": "application/json",
            }),
      },

      ...(payload === undefined
        ? {}
        : {
            body: JSON.stringify(payload),
          }),

      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Cannot reach the payment-review service. Check your backend connection."
    );
  }

  const data = await response.json().catch(
    () => ({})
  );

  if (!response.ok) {
    const error = new Error(
      data?.error || "Payment review request failed."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// Existing Sprint 1 saved review functionality.
export async function getSavedPaymentReview() {
  const data = await requestReview("/saved");

  return data.saved;
}

// Existing Sprint 1 review actions.
export function reviewAction(action, draft, answers) {
  return requestReview(`/${action}`, {
    draft,

    ...(answers === undefined
      ? {}
      : { answers }),
  });
}

// Sprint 2: Retrieve database-backed payment history.
export async function getRecipientPaymentHistoryFromApi(
  draft
) {
  const data = await requestReview(
    "/recipient-history",
    {
      recipientNumber: draft.recipientNumber,
      amount: draft.amount,
    }
  );

  if (
    !data.history ||
    !Array.isArray(data.history.payments) ||
    typeof data.history.isNewRecipient !== "boolean"
  ) {
    throw new Error(
      "Payment history is unavailable."
    );
  }

  return data.history;
}

// Sprint 2: Use trusted database history while preserving
// the existing local simulator risk signals.
export async function assessLivePayment(
  draft,
  assess,
  context = {}
) {
  let server = null;
  let response = null;
  let isNewRecipient;

  if (draft.transferType === "ecommerce") {
    // Preserve Sprint 1 database-backed review assessment.
    response = await reviewAction("assess", draft);

    server = response.risk;

    if (
      !server ||
      typeof server.blocked !== "boolean" ||
      typeof server.isNewRecipient !== "boolean"
    ) {
      throw new Error(
        "The payment safety response is incomplete."
      );
    }

    isNewRecipient = server.isNewRecipient;
  } else {
    // Shared read-only history for other payment methods.
    // Do not use the e-commerce-only review transition API.
    const history =
      await getRecipientPaymentHistoryFromApi(draft);

    isNewRecipient = history.isNewRecipient;
  }

  const local = await assess(draft, {
    ...context,

    serverIsNewRecipient: isNewRecipient,
  });

  // Keep existing PayNow, bank transfer, Scan & Pay
  // and simulator risk behaviours.
  if (!server) {
    return local;
  }

  const score = Math.max(
    local.score,
    server.score || 0
  );

  const level =
    score >= 60
      ? "high"
      : score >= 30
        ? "medium"
        : "low";

  return {
    ...local,

    score,
    level,

    requiresSafetyReview:
      local.requiresSafetyReview ||
      level === "high",

    requiresReview:
      local.requiresReview ||
      server.requiresReview,

    conditions: {
      ...local.conditions,

      // PBI-34: Trust the backend's recipient history.
      firstTimeRecipient:
        server.firstTimeRecipient === true,
    },

    canProceedToConfirmation:
      local.canProceedToConfirmation &&
      !server.blocked,

    restrictionReason:
      server.blocked
        ? server.reason
        : local.restrictionReason,

    reasons: [
      ...new Set([
        ...local.reasons,

        ...(server.reason
          ? [server.reason]
          : []),
      ]),
    ],

    serverAcknowledged:
      response.acknowledged === true,
  };
}