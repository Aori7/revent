
"use strict";

const allowedAnswers = {
  extraFee: ["yes", "no", "unsure"],
  disclosed: ["yes", "no", "unsure"],
  source: ["retailer", "marketplace", "social", "unknown"],
  identity: ["yes", "no", "unsure"],
  urgency: ["yes", "no", "unsure"],
  reviews: ["yes", "no", "unsure"],
  secrecy: ["yes", "no"],
};

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function paymentFromDraft(draft) {
  if (
    !draft ||
    typeof draft !== "object" ||
    Array.isArray(draft)
  ) {
    invalid("Invalid payment details.");
  }

  if (draft.transferType !== "ecommerce") {
    invalid(
      "Only e-commerce reviews are supported by this endpoint."
    );
  }

  const recipientName = draft.recipientName;

  const recipientNumber = String(
    draft.recipientNumber ?? ""
  ).replace(/[\s-]/g, "");

  const reference = draft.reference ?? "";
  const amountText = String(draft.amount ?? "");
  const amount = Number(amountText);

  if (
    typeof recipientName !== "string" ||
    !recipientName.trim() ||
    recipientName.trim().length > 120 ||
    !/^\d{8,16}$/.test(recipientNumber) ||
    typeof reference !== "string" ||
    reference.length > 120 ||
    !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amountText) ||
    !Number.isFinite(amount) ||
    amount < 0.01 ||
    amount > 1000000
  ) {
    invalid(
      "Enter a valid recipient, amount, and reference."
    );
  }

  return {
    transferType: "ecommerce",
    recipientName: recipientName.trim(),
    recipientNumber,
    amount: amount.toFixed(2),
    reference: reference.trim(),
  };
}

// Match existing frontend conditional question logic.
function visibleAnswerIds(answers) {
  return [
    "extraFee",

    ...(answers.extraFee === "yes"
      ? ["disclosed"]
      : []),

    "source",
    "identity",
    "urgency",

    ...(["social", "unknown"].includes(answers.source)
      ? ["reviews"]
      : []),

    ...(answers.urgency === "yes"
      ? ["secrecy"]
      : []),
  ];
}

function validatedAnswers(input, requireAll) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    invalid("Invalid review answers.");
  }

  const answers = {};

  // Validate only the recognised questionnaire fields.
  for (const [key, allowed] of Object.entries(allowedAnswers)) {
    const value = input[key] ?? "";

    if (
      typeof value !== "string" ||
      (value !== "" && !allowed.includes(value))
    ) {
      invalid(`Invalid answer for ${key}.`);
    }

    answers[key] = value;
  }

  const visible = new Set(visibleAnswerIds(answers));

  // Hidden conditional questions must not retain old answers.
  for (const key of Object.keys(answers)) {
    if (!visible.has(key)) {
      answers[key] = "";
    }
  }

  // Partial answers are allowed when saving, not completing.
  if (
    requireAll &&
    [...visible].some((key) => !answers[key])
  ) {
    invalid(
      "Answer all visible questions before continuing."
    );
  }

  return answers;
}

function parsedReview(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    invalid("Invalid review request.");
  }

  const draft = body.draft;

  if (
    !draft ||
    typeof draft !== "object" ||
    Array.isArray(draft) ||
    typeof draft.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      draft.id
    ) ||
    !Number.isSafeInteger(draft.version) ||
    draft.version < 1 ||
    draft.version > 2147483647
  ) {
    invalid("Invalid review identifier or version.");
  }

  return {
    id: draft.id,
    version: draft.version,
    payment: paymentFromDraft(draft),
  };
}

module.exports = {
  parsedReview,
  validatedAnswers,
  visibleAnswerIds,
};
