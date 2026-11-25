const BASE_URL = "/api/payment-review";
async function requestReview(path, payload) {
  const token = sessionStorage.getItem("reventAccessToken");

  if (!token) {
    throw new Error(
      "Please log in to continue your payment review."
    );
  }

  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: payload === undefined ? "GET" : "POST",

      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },

      ...(payload === undefined
        ? {}
        : { body: JSON.stringify(payload) }),

      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Cannot reach the payment-review service. Check your backend connection."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.error || "Payment review request failed."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// Retrieve the latest saved review for this customer.
export async function getSavedPaymentReview() {
  const data = await requestReview("/saved");
  return data.saved;
}

// Perform a review action.
export function reviewAction(action, draft, answers) {
  return requestReview(`/${action}`, {
    draft,
    ...(answers === undefined ? {} : { answers }),
  });
}
