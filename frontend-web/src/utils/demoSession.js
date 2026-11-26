import {
  startingPayment,
  demoCustomer,
  demoAccount,
} from "../data/demoBanking.js";

import {
  draftSignature,
  cleanAnswers,
  defaultAnswers,
  unansweredQuestions,
  getReviewContext,
} from "./banking.js";

import { getRiskAssessment } from "./riskSession.js";

const DRAFT = "revent.demo.paymentDraft";
const REVIEW = "revent.demo.paymentReview";
const SAVED = "revent.demo.savedPayment";
const COMPLETED = "revent.demo.completedReview";
const RESTRICTION = "revent.demo.paymentRestriction";

function readJson(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

function currentUserId() {
  return sessionStorage.getItem("reventUserId");
}

function signedIn() {
  return Boolean(
    sessionStorage.getItem("reventAccessToken") &&
    currentUserId()
  );
}

function owned(record) {
  return (
    signedIn() &&
    record?.customerId === currentUserId()
  );
}

export function validPayment(draft) {
  const maximumAmount =
    draft?.transferType === "ecommerce"
      ? 1000000
      : demoAccount.balance;

  return (
    typeof draft?.recipientName === "string" &&
    Boolean(draft.recipientName.trim()) &&
    /^\d{8,16}$/.test(
      String(draft.recipientNumber).replace(/[\s-]/g, "")
    ) &&
    /^\d+(\.\d{1,2})?$/.test(String(draft.amount)) &&
    Number(draft.amount) > 0 &&
    Number(draft.amount) <= maximumAmount
  );
}

export function activeDraft() {
  const draft = readJson(DRAFT);

  if (
    !owned(draft) ||
    !draft.id ||
    !draft.version ||
    !validPayment(draft)
  ) {
    return null;
  }

  return draft;
}

export function readDraft() {
  const draft = readJson(DRAFT);

  // Retain support for legacy simulator drafts.
  const isLegacyDraft =
    draft && !draft.customerId && !draft.id;

  if (owned(draft) || isLegacyDraft) {
    return {
      ...startingPayment,
      ...draft,
    };
  }

  return { ...startingPayment };
}

function matches(record, draft) {
  return (
    owned(record) &&
    Boolean(draft) &&
    record.id === draft.id &&
    record.version === draft.version &&
    record.signature === draftSignature(draft)
  );
}

function requireActive(draft) {
  if (!owned(draft)) {
    throw new Error(
      "You do not have access to this payment."
    );
  }

  const record = {
    ...draft,
    signature: draftSignature(draft),
  };

  if (!matches(record, activeDraft())) {
    throw new Error(
      "This payment has changed or is no longer available. Return to Transfer & Pay."
    );
  }
}

// Clear the active questionnaire and completed review.
// Previously saved reviews are not deleted.
export function invalidateReview() {
  sessionStorage.removeItem(COMPLETED);
  sessionStorage.removeItem(REVIEW);
}

export function saveDraft(form) {
  if (!signedIn() || !validPayment(form)) {
    throw new Error("Enter valid payment details.");
  }

  const old = activeDraft();

  // Every e-commerce payment submission must start
  // with a fresh questionnaire, even if the recipient,
  // amount and reference remain unchanged.
  const freshReview =
    form.transferType === "ecommerce";

  const changed =
    freshReview ||
    !old ||
    draftSignature(old) !== draftSignature(form);

  if (changed) {
    invalidateReview();
  }

  // Reset the old risk assessment and acknowledgement
  // for a newly submitted e-commerce review.
  if (freshReview) {
    sessionStorage.removeItem(
      "revent.demo.transactionRisk"
    );

    sessionStorage.removeItem(
      "revent.firstRecipientAcknowledgement"
    );
  }

  const draft = {
    ...form,

    customerId: currentUserId(),

    id: old?.id || crypto.randomUUID(),

    // A new version ensures the backend also resets
    // the previous review and questionnaire answers.
    version:
      (old?.version || 0) + Number(changed),
  };

  sessionStorage.setItem(
    DRAFT,
    JSON.stringify(draft)
  );

  return draft;
}

export function readAnswers(draft) {
  const previous = readJson(REVIEW);

  // Restore answers only when they belong to
  // the current payment ID and version.
  if (
    owned(draft) &&
    matches(previous, draft)
  ) {
    return cleanAnswers(previous.answers);
  }

  // Fresh questionnaire with no selected category.
  return {
    ...defaultAnswers,
    purpose: "",
  };
}

function reviewRecord(draft, answers) {
  requireActive(draft);

  return {
    customerId: draft.customerId,
    id: draft.id,
    version: draft.version,
    signature: draftSignature(draft),

    // Preserve relevant personalised answers.
    answers: cleanAnswers(answers),
  };
}

export function saveAnswers(draft, answers) {
  const record = reviewRecord(draft, answers);

  sessionStorage.removeItem(COMPLETED);

  sessionStorage.setItem(
    REVIEW,
    JSON.stringify(record)
  );
}

export function saveReviewForLater(
  customerId,
  draft,
  answers
) {
  if (
    !signedIn() ||
    customerId !== currentUserId()
  ) {
    throw new Error("Access denied.");
  }

  const context = getReviewContext(
    draft,
    getRiskAssessment()
  );

  const record = {
    ...reviewRecord(draft, answers),

    draft,

    unresolvedQuestions: unansweredQuestions(
      answers,
      context
    ),

    savedAt: new Date().toISOString(),
  };

  sessionStorage.setItem(
    SAVED,
    JSON.stringify(record)
  );

  return record;
}

export function getSavedReview(
  customerId = currentUserId()
) {
  const saved = readJson(SAVED);

  if (
    !owned(saved) ||
    saved.customerId !== customerId ||
    !validPayment(saved.draft)
  ) {
    return null;
  }

  return saved;
}

export function readRestriction() {
  return sessionStorage.getItem(RESTRICTION) || "";
}

export function setRestriction(value) {
  if (value) {
    sessionStorage.setItem(RESTRICTION, value);
  } else {
    sessionStorage.removeItem(RESTRICTION);
  }

  window.dispatchEvent(
    new Event("payment-restriction")
  );
}

export function completeReview(draft, answers) {
  const record = reviewRecord(draft, answers);

  const context = getReviewContext(
    draft,
    getRiskAssessment()
  );

  // Validate all relevant questionnaire answers.
  if (
    unansweredQuestions(
      record.answers,
      context
    ).length > 0
  ) {
    throw new Error(
      "Answer all visible questions."
    );
  }

  // Preserve existing payment restrictions.
  const restriction = readRestriction();

  if (restriction) {
    throw new Error(restriction);
  }

  sessionStorage.setItem(
    COMPLETED,
    JSON.stringify(record)
  );
}

// Only explicitly resumed reviews restore
// their original payment details and answers.
export function restoreSavedPaymentReview(saved) {
  const draft = saved?.draft;

  if (
    !owned(draft) ||
    !draft.id ||
    !Number.isSafeInteger(draft.version) ||
    draft.version < 1 ||
    !validPayment(draft)
  ) {
    throw new Error(
      "The saved payment review is no longer available."
    );
  }

  invalidateReview();

  // Clear the previous active payment's risk assessment.
  // The resumed payment will be assessed again.
  sessionStorage.removeItem(
    "revent.demo.transactionRisk"
  );

  sessionStorage.removeItem(
    "revent.firstRecipientAcknowledgement"
  );

  // Retain the original saved review ID and version.
  sessionStorage.setItem(
    DRAFT,
    JSON.stringify(draft)
  );

  // Restore the previously selected category
  // and relevant questionnaire answers.
  saveAnswers(
    draft,
    saved.answers || {}
  );

  return draft;
}

export function hasCompletedReview(draft) {
  return matches(
    readJson(COMPLETED),
    draft
  );
}

export function canConfirm() {
  const draft = activeDraft();

  if (!draft || readRestriction()) {
    return false;
  }

  const completedReview = matches(
    readJson(COMPLETED),
    draft
  );

  if (completedReview) {
    return true;
  }

  const risk = getRiskAssessment();

  return risk?.level === "low";
}

// Existing cancellation functionality.
export async function cancelPayment(draft) {
  requireActive(draft);

  const saved = getSavedReview(
    draft.customerId
  );

  if (
    saved &&
    (
      !saved.draft.id ||
      saved.draft.id === draft.id
    )
  ) {
    sessionStorage.removeItem(SAVED);
  }

  invalidateReview();

  sessionStorage.removeItem(DRAFT);
}

// Clear a successfully completed e-commerce payment.
export function finishPayment(draft) {
  requireActive(draft);

  const saved = getSavedReview(
    draft.customerId
  );

  // Preserve unrelated saved payment reviews.
  if (saved?.draft?.id === draft.id) {
    sessionStorage.removeItem(SAVED);
  }

  invalidateReview();

  sessionStorage.removeItem(DRAFT);

  sessionStorage.removeItem(
    "revent.demo.transactionRisk"
  );

  sessionStorage.removeItem(
    "revent.firstRecipientAcknowledgement"
  );
}