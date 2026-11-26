export function formatSGD(amount) {
  return `SGD ${Math.abs(Number(amount)).toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function maskIdentifier(value) {
  const clean = String(value ?? "").replace(/[^0-9A-Za-z]/g, "");

  if (!clean) return "Not available";

  return "•".repeat(Math.max(4, clean.length - 4)) + clean.slice(-4);
}

export function draftSignature(draft) {
  return JSON.stringify({
    recipientName: (draft.recipientName || "").trim(),
    recipientNumber: (draft.recipientNumber || "").replace(/[\s-]/g, ""),
    amount: Number(draft.amount).toFixed(2),
    reference: (draft.reference || "").trim(),
  });
}

// Payment purpose categories
export const paymentPurposes = [
  ["shopping", "Online shopping"],
  ["personal", "Friends & family"],
  ["bills", "Bills & official payments"],
  ["investment", "Investment"],
  ["job", "Job & business"],
  ["general", "Other / Not sure"],
];

// Retain previous answer fields for compatibility.
export const defaultAnswers = {
  purpose: "",
  extraFee: "",
  disclosed: "",
  source: "",
  identity: "",
  urgency: "",
  reviews: "",
  secrecy: "",
  newContact: "",
  unexpectedRequest: "",
  guaranteedReturns: "",
  upfrontFee: "",
  purposeKnown: "",
  recipientSource: "",
  amountConfirmed: "",
};

const categoryQuestions = {
  shopping: "disclosed",
  personal: "newContact",
  bills: "unexpectedRequest",
  investment: "guaranteedReturns",
  job: "upfrontFee",
  general: "purposeKnown",
};

// Existing transaction risk conditions
export function getReviewContext(draft, assessment) {
  return {
    firstTimeRecipient:
      assessment?.conditions?.firstTimeRecipient === true,

    largeAmount:
      Number(draft?.amount) > 1000,
  };
}

// Keep the questionnaire short and relevant.
export function visibleQuestions(answers = {}, context = {}) {
  if (
    !paymentPurposes.some(
      ([value]) => value === answers.purpose
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

    // Additional check only for large payments
    ...(context.largeAmount
      ? ["amountConfirmed"]
      : []),

    // Combined pressure and secrecy check
    "urgency",
  ];
}

// Remove answers that are no longer relevant.
export function cleanAnswers(answers = {}, context) {
  const visible = new Set(
    visibleQuestions(answers, context)
  );

  // Preserve previously saved Sprint 1 answers
  // until a payment purpose is selected.
  if (!answers.purpose) {
    visible.add("extraFee");
    visible.add("source");
    visible.add("identity");
    visible.add("urgency");

    if (answers.extraFee === "yes") {
      visible.add("disclosed");
    }

    if (["social", "unknown"].includes(answers.source)) {
      visible.add("reviews");
    }

    if (answers.urgency === "yes") {
      visible.add("secrecy");
    }
  }

  // Preserve the amount verification answer when
  // saving or restoring browser-session data.
  if (
    context === undefined &&
    paymentPurposes.some(
      ([value]) => value === answers.purpose
    )
  ) {
    visible.add("amountConfirmed");
  }

  return Object.fromEntries(
    Object.keys(defaultAnswers).map((key) => [
      key,
      visible.has(key)
        ? answers[key] || ""
        : "",
    ])
  );
}

export function unansweredQuestions(
  answers = {},
  context
) {
  return visibleQuestions(answers, context).filter(
    (key) => !answers[key]
  );
}

function collectRiskFactors(answers) {
  const factors = [];

  function add(points, message, advice) {
    factors.push({
      points,
      message,
      advice,
    });
  }

  // Recipient identity
  if (answers.identity === "no") {
    add(
      25,
      "Recipient not verified",
      "Verify the recipient through a trusted channel."
    );
  } else if (answers.identity === "unsure") {
    add(
      15,
      "Recipient identity uncertain",
      "Confirm who will receive this payment."
    );
  }

  // Payment pressure or secrecy
  if (answers.urgency === "yes") {
    add(
      20,
      "Payment pressure or secrecy",
      "Pause and verify the request."
    );
  } else if (answers.urgency === "unsure") {
    add(
      10,
      "Possible payment pressure",
      "Take time to check the request."
    );
  }

  // Retain support for older saved answers.
  if (answers.secrecy === "yes") {
    add(
      25,
      "Asked to keep payment secret",
      "Speak to someone you trust."
    );
  }

  // Online shopping
  if (answers.purpose === "shopping") {
    if (answers.disclosed === "no") {
      add(
        20,
        "Undisclosed charges",
        "Check the original order or invoice."
      );
    } else if (answers.disclosed === "unsure") {
      add(
        10,
        "Payment charges unclear",
        "Verify the charges before paying."
      );
    }
  }

  // Friends and family
  if (answers.purpose === "personal") {
    if (answers.newContact === "yes") {
      add(
        20,
        "Unfamiliar contact number",
        "Call their usual number to verify."
      );
    } else if (answers.newContact === "unsure") {
      add(
        10,
        "Contact number uncertain",
        "Confirm the person's identity."
      );
    }
  }

  // Bills and official payments
  if (answers.purpose === "bills") {
    if (answers.unexpectedRequest === "yes") {
      add(
        20,
        "Unexpected payment request",
        "Contact the organisation directly."
      );
    } else if (answers.unexpectedRequest === "unsure") {
      add(
        10,
        "Payment request uncertain",
        "Check through official channels."
      );
    }
  }

  // Investment
  if (answers.purpose === "investment") {
    if (answers.guaranteedReturns === "yes") {
      add(
        30,
        "Promised guaranteed high returns",
        "Verify the investment provider independently."
      );
    } else if (answers.guaranteedReturns === "unsure") {
      add(
        10,
        "Investment terms uncertain",
        "Review the investment terms."
      );
    }
  }

  // Job and business
  if (answers.purpose === "job") {
    if (answers.upfrontFee === "yes") {
      add(
        30,
        "Upfront payment requested",
        "Verify the opportunity before paying."
      );
    } else if (answers.upfrontFee === "unsure") {
      add(
        10,
        "Upfront payment unclear",
        "Confirm why payment is required."
      );
    }
  }

  // General payment
  if (answers.purpose === "general") {
    if (answers.purposeKnown === "no") {
      add(
        25,
        "Payment purpose unclear",
        "Do not pay until you understand the request."
      );
    } else if (answers.purposeKnown === "unsure") {
      add(
        15,
        "Uncertain payment purpose",
        "Clarify the reason for payment."
      );
    }
  }

  // Large transaction
  if (answers.amountConfirmed === "no") {
    add(
      20,
      "Payment amount not confirmed",
      "Confirm the amount before paying."
    );
  } else if (answers.amountConfirmed === "unsure") {
    add(
      10,
      "Payment amount uncertain",
      "Check the requested amount."
    );
  }

  return factors;
}

// Preserve personalised advice functionality.
export function generatePaymentAdvice(answers) {
  const factors = collectRiskFactors(answers);

  const concerns = factors.map(
    (factor) => factor.message
  );

  const steps = [
    ...new Set(
      factors.map((factor) => factor.advice)
    ),
  ];

  if (steps.length === 0) {
    steps.push(
      "Check the recipient and amount before paying."
    );
  }

  return {
    concerns,
    steps,
    needsExtraCare: concerns.length > 0,
  };
}

// Prevent proceeding with serious warning signs.
export function hasSeriousReviewWarning(answers) {
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

// Existing percentage-based risk summary
export function calculatePaymentRisk(
  answers,
  assessment
) {
  const factors = collectRiskFactors(answers);

  const riskLevel = String(
    assessment?.level || "low"
  ).toLowerCase();

  // Preserve detected transaction risk.
  if (riskLevel === "high") {
    factors.push({
      points: 30,
      message: "High-risk transaction detected",
      advice: "Pause and verify this payment.",
    });
  } else if (
    ["medium", "moderate"].includes(riskLevel)
  ) {
    factors.push({
      points: 15,

      message:
        assessment?.conditions?.firstTimeRecipient
          ? "First-time recipient"
          : "Unusual transaction activity",

      advice: "Confirm the payment details.",
    });
  }

  const percentage = Math.min(
    100,
    factors.reduce(
      (total, factor) => total + factor.points,
      0
    )
  );

  let level = "Low";

  if (percentage >= 70) {
    level = "High";
  } else if (percentage >= 35) {
    level = "Moderate";
  }

  factors.sort(
    (a, b) => b.points - a.points
  );

  const recommendation =
    hasSeriousReviewWarning(answers)
      ? "Verify the request before proceeding."
      : factors[0]?.advice ||
        "Check the recipient and amount before paying.";

  return {
    percentage,
    level,
    factors: factors.slice(0, 3),
    recommendation,
  };
}