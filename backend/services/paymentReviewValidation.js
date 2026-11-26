"use strict";

const yesNoUnsure = [
  "yes",
  "no",
  "unsure",
];

// Retain previous fields for compatibility.
const allowedAnswers = {
  purpose: [
    "shopping",
    "personal",
    "bills",
    "investment",
    "job",
    "general",
  ],

  extraFee: yesNoUnsure,
  disclosed: yesNoUnsure,

  source: [
    "retailer",
    "marketplace",
    "social",
    "unknown",
  ],

  identity: yesNoUnsure,
  urgency: yesNoUnsure,
  reviews: yesNoUnsure,
  secrecy: ["yes", "no"],

  newContact: yesNoUnsure,
  unexpectedRequest: yesNoUnsure,
  guaranteedReturns: yesNoUnsure,
  upfrontFee: yesNoUnsure,
  purposeKnown: yesNoUnsure,

  recipientSource: [
    "known",
    "official",
    "message",
    "unknown",
  ],

  amountConfirmed: yesNoUnsure,
};

const categoryQuestions = {
  shopping: "disclosed",
  personal: "newContact",
  bills: "unexpectedRequest",
  investment: "guaranteedReturns",
  job: "upfrontFee",
  general: "purposeKnown",
};

function invalid(message) {
  const error = new Error(message);

  error.status = 400;

  throw error;
}

// Preserve existing payment validation.
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

  const amountText = String(
    draft.amount ?? ""
  );

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

    recipientName:
      recipientName.trim(),

    recipientNumber,

    amount:
      amount.toFixed(2),

    reference:
      reference.trim(),
  };
}

// Match the shortened frontend questionnaire.
function visibleAnswerIds(
  answers = {},
  context = {}
) {
  if (
    !allowedAnswers.purpose.includes(
      answers.purpose
    )
  ) {
    return ["purpose"];
  }

  return [
    "purpose",

    // One category-specific question
    categoryQuestions[answers.purpose],

    // Common recipient verification
    "identity",

    // Additional question only for large payments
    ...(context.largeAmount
      ? ["amountConfirmed"]
      : []),

    // Combined pressure and secrecy check
    "urgency",
  ];
}

function validatedAnswers(
  input,
  requireAll,
  context = {}
) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    invalid("Invalid review answers.");
  }

  const answers = {};

  // Validate every recognised answer.
  for (
    const [key, allowed]
    of Object.entries(allowedAnswers)
  ) {
    const value = input[key] ?? "";

    if (
      typeof value !== "string" ||
      (
        value !== "" &&
        !allowed.includes(value)
      )
    ) {
      invalid(
        `Invalid answer for ${key}.`
      );
    }

    answers[key] = value;
  }

  const required = visibleAnswerIds(
    answers,
    context
  );

  const visible = new Set(required);

  // Preserve older saved Sprint 1 answers until
  // a payment purpose has been selected.
  if (
    !requireAll &&
    !answers.purpose
  ) {
    visible.add("extraFee");
    visible.add("source");
    visible.add("identity");
    visible.add("urgency");

    if (answers.extraFee === "yes") {
      visible.add("disclosed");
    }

    if (
      ["social", "unknown"].includes(
        answers.source
      )
    ) {
      visible.add("reviews");
    }

    if (answers.urgency === "yes") {
      visible.add("secrecy");
    }
  }

  // Clear hidden and irrelevant answers.
  for (const key of Object.keys(answers)) {
    if (!visible.has(key)) {
      answers[key] = "";
    }
  }

  // Saving allows partial answers.
  // Summary and completion require every active question.
  if (
    requireAll &&
    required.some(
      (key) => !answers[key]
    )
  ) {
    invalid(
      "Complete all safety questions."
    );
  }

  return answers;
}

// Preserve existing serious warning restrictions.
function hasSeriousWarning(answers) {
  return (
    answers.identity !== "yes" ||
    answers.urgency === "yes" ||
    answers.secrecy === "yes" ||

    (
      answers.purpose === "shopping" &&
      answers.disclosed !== "yes"
    ) ||

    (
      answers.extraFee === "yes" &&
      answers.disclosed !== "yes"
    ) ||

    answers.guaranteedReturns === "yes" ||
    answers.upfrontFee === "yes" ||

    ["no", "unsure"].includes(
      answers.purposeKnown
    ) ||

    ["no", "unsure"].includes(
      answers.amountConfirmed
    )
  );
}

// Preserve existing draft ID and version validation.
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
    invalid(
      "Invalid review identifier or version."
    );
  }

  return {
    id: draft.id,
    version: draft.version,

    payment:
      paymentFromDraft(draft),
  };
}

module.exports = {
  parsedReview,
  validatedAnswers,
  visibleAnswerIds,
  hasSeriousWarning,
};