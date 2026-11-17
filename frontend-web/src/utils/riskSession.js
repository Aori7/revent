import { activeDraft } from "./demoSession.js";
import { draftSignature } from "./banking.js";
import { ASSESSMENT_VERSION } from "./riskAssessment.js";

const RISK_KEY = "revent.demo.transactionRisk";
const ACK_KEY = "revent.firstRecipientAcknowledgement";

export function paymentKey(draft) {
  return draft
    ? JSON.stringify([
        draft.customerId,
        draft.id,
        draft.version,
        draft.transferType || "ecommerce",
        draft.bankName || "",
        draftSignature(draft),
      ])
    : "";
}

export function saveRiskAssessment(draft, result) {
  if (paymentKey(draft) !== paymentKey(activeDraft())) {
    throw new Error(
      "Payment details have changed. Please review them again."
    );
  }

  const record = {
    customerId: draft.customerId,
    draftId: draft.id,
    version: draft.version,
    signature: draftSignature(draft),
    key: paymentKey(draft),
    result,
    assessedAt: new Date().toISOString(),
  };

  sessionStorage.setItem(RISK_KEY, JSON.stringify(record));

  return record;
}

export function getRiskAssessment() {
  const draft = activeDraft();

  if (!draft) return null;

  try {
    const record = JSON.parse(sessionStorage.getItem(RISK_KEY));

    if (
      record?.key !== paymentKey(draft) ||
      record?.result?.assessmentVersion !== ASSESSMENT_VERSION
    ) {
      return null;
    }

    return record.result;
  } catch {
    return null;
  }
}

export function hasAcknowledgedAlert(draft) {
  try {
    return (
      Boolean(draft) &&
      sessionStorage.getItem(ACK_KEY) === paymentKey(draft)
    );
  } catch {
    return false;
  }
}

export function acknowledgeAlert(draft) {
  if (paymentKey(draft) !== paymentKey(activeDraft())) {
    throw new Error(
      "Payment details have changed. Please review them again."
    );
  }

  sessionStorage.setItem(ACK_KEY, paymentKey(draft));
}

export function clearRiskAssessment() {
  sessionStorage.removeItem(RISK_KEY);
}